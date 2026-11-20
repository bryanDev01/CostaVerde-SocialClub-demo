import { UserStatusReport } from '@/components/Admin/UserStatusReport'

export default function HrReportsPage() {
  return (
    <UserStatusReport
      eyebrow="Reportes HR"
      backHref="/hr"
      backLabel="Volver al panel HR"
      directoryHref="/hr/users"
      preloadHref="/hr/employees"
      preloadLabel="Ver precargas HR"
    />
  )
}
