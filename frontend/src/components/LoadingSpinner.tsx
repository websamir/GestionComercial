interface Props {
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

export default function LoadingSpinner({ size = 'md', fullScreen = false }: Props) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }

  const spinner = (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-2 border-primary border-t-transparent`}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          <span className="text-sm text-text-secondary">Cargando...</span>
        </div>
      </div>
    )
  }

  return spinner
}
