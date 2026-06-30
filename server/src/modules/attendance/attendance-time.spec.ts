describe('attendance time calculation', () => {
  it('rounds a session duration to whole minutes', () => {
    const clockIn = new Date('2026-07-01T08:00:00.000Z');
    const clockOut = new Date('2026-07-01T16:29:30.000Z');
    const minutes = Math.max(0, Math.round((clockOut.getTime() - clockIn.getTime()) / 60_000));

    expect(minutes).toBe(510);
  });
});
