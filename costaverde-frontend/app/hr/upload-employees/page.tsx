import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EmployeeBulkUploadForm } from '@/components/Forms/EmployeeBulkUploadForm'

export default function UploadEmployeesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/hr"
        className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver al panel
      </Link>

      <header className="mt-6 animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Precarga masiva
        </p>
        <h1 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Cargar empleados
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Sube un archivo CSV o Excel con los empleados de cualquier empresa. Cada uno
          podrá registrarse validando su CI y activar su cuenta al pagar la
          suscripción.
        </p>
      </header>

      <div className="mt-10 animate-fade-up motion-reduce:animate-none" style={{ animationDelay: '100ms' }}>
        <EmployeeBulkUploadForm />
      </div>
    </div>
  )
}
