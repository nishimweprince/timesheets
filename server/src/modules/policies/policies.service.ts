import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RequestUser } from '../../common/types/authenticated-request';
import { AttendancePolicy, AttendancePolicyRules, PolicyEnforcement } from './entities/attendance-policy.entity';
import { AttendancePolicyAssignment, PolicyAssignmentScope } from './entities/attendance-policy-assignment.entity';
import { WorkSite } from './entities/work-site.entity';
import { CreatePolicyAssignmentDto, CreatePolicyDto, CreateWorkSiteDto } from './dto/policy.dto';

export const DEFAULT_POLICY_RULES: AttendancePolicyRules = {
  requireClockInPhoto: true,
  requireClockOutPhoto: false,
  requireLocation: false,
  unplannedClockIn: PolicyEnforcement.FLAG,
  outsideGeofence: PolicyEnforcement.FLAG,
  earlyClockInGraceMinutes: 15,
  lateClockInGraceMinutes: 5,
  maxShiftMinutes: 16 * 60
};

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(AttendancePolicy) private readonly policies: Repository<AttendancePolicy>,
    @InjectRepository(AttendancePolicyAssignment) private readonly assignments: Repository<AttendancePolicyAssignment>,
    @InjectRepository(WorkSite) private readonly workSites: Repository<WorkSite>
  ) {}

  async createPolicy(user: RequestUser, dto: CreatePolicyDto): Promise<AttendancePolicy> {
    return this.policies.save(this.policies.create({ organizationId: user.organizationId, name: dto.name, rules: dto.rules }));
  }

  findPolicies(user: RequestUser): Promise<AttendancePolicy[]> {
    return this.policies.find({ where: { organizationId: user.organizationId }, order: { createdAt: 'DESC' } });
  }

  async assignPolicy(user: RequestUser, dto: CreatePolicyAssignmentDto): Promise<AttendancePolicyAssignment> {
    await this.ensurePolicy(user.organizationId, dto.policyId);
    return this.assignments.save(
      this.assignments.create({
        organizationId: user.organizationId,
        policyId: dto.policyId,
        scope: dto.scope,
        scopeId: dto.scopeId ?? null
      })
    );
  }

  async createWorkSite(user: RequestUser, dto: CreateWorkSiteDto): Promise<WorkSite> {
    return this.workSites.save(
      this.workSites.create({ organizationId: user.organizationId, name: dto.name, timezone: dto.timezone ?? 'America/Chicago' })
    );
  }

  findWorkSites(user: RequestUser): Promise<WorkSite[]> {
    return this.workSites.find({ where: { organizationId: user.organizationId, active: true }, order: { name: 'ASC' } });
  }

  async effectivePolicy(organizationId: string, employeeMembershipId: string): Promise<{ policy: AttendancePolicy | null; rules: AttendancePolicyRules }> {
    const employeeAssignment = await this.assignments.findOne({
      where: { organizationId, scope: PolicyAssignmentScope.EMPLOYEE, scopeId: employeeMembershipId, active: true }
    });
    const orgAssignment = await this.assignments.findOne({
      where: { organizationId, scope: PolicyAssignmentScope.ORGANIZATION, scopeId: IsNull(), active: true }
    });
    const assignment = employeeAssignment ?? orgAssignment;
    if (!assignment) return { policy: null, rules: DEFAULT_POLICY_RULES };
    const policy = await this.policies.findOne({ where: { id: assignment.policyId, organizationId, active: true } });
    return { policy, rules: policy?.rules ?? DEFAULT_POLICY_RULES };
  }

  policyResult(rules: AttendancePolicyRules, checks: { hasShift: boolean; geofenceInside?: boolean | null }) {
    const exceptions: Array<{ code: string; severity: string; message: string }> = [];
    if (!checks.hasShift && rules.unplannedClockIn === PolicyEnforcement.FLAG) {
      exceptions.push({ code: 'UNPLANNED_CLOCK_IN', severity: 'WARNING', message: 'Clock-in did not match an assigned shift.' });
    }
    if (checks.geofenceInside === false && rules.outsideGeofence === PolicyEnforcement.FLAG) {
      exceptions.push({ code: 'OUTSIDE_GEOFENCE', severity: 'WARNING', message: 'Clock action was outside the expected geofence.' });
    }
    return { allowed: true, requiresReview: false, exceptions };
  }

  private async ensurePolicy(organizationId: string, policyId: string): Promise<void> {
    const policy = await this.policies.findOne({ where: { id: policyId, organizationId } });
    if (!policy) throw new NotFoundException('Attendance policy not found');
  }
}
