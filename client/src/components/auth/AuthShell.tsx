import type { ReactNode } from 'react'

type AuthShellProps = {
  children: ReactNode
  leftPanel?: ReactNode
  showLeftPanel?: boolean
}

const DefaultLeftPanel = () => (
  <>
    <div className="relative z-10 flex flex-col gap-4">
      <p className="text-sm font-medium tracking-[0.2em] text-primary uppercase">
        Tuza Health
      </p>
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-lg font-medium text-foreground">
          Institution workforce management
        </h1>
        <p className="text-sm text-muted-foreground">
          Secure access for hospital and clinic staff to manage attendance,
          shifts, and timesheets.
        </p>
      </div>
    </div>

    <p className="relative z-10 mt-10 text-sm text-muted-foreground md:mt-0">
      © {new Date().getFullYear()} Tuza Health
    </p>
  </>
)

const AuthShell = ({ children, leftPanel, showLeftPanel = false }: AuthShellProps) => {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
     {showLeftPanel ? <aside className="relative flex flex-col justify-between overflow-hidden bg-auth-panel px-8 py-10 md:w-1/2 md:px-12 md:py-16 lg:px-16">
        <div
          aria-hidden
          className="auth-grid-pattern pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden
          className="auth-pulse-line pointer-events-none absolute top-0 right-0 hidden h-full w-px md:block"
        />

        {showLeftPanel ? (leftPanel ?? <DefaultLeftPanel />) : null}
      </aside> : null}

      <main className="flex flex-1 items-center justify-center bg-background px-6 py-10 md:px-12 md:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}

export default AuthShell
