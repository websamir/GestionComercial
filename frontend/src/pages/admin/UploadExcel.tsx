import { useState, useRef, DragEvent } from 'react'
import { getUploadInfo, uploadExcel } from '../../api/company'
import type { UploadInfo } from '../../types'

interface Props {
  info: UploadInfo | null
  onUploaded: (info: UploadInfo) => void
}

export default function UploadExcel({ info, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Solo se permiten archivos Excel (.xlsx, .xls)')
      return
    }
    setError('')
    setSuccess('')
    setUploading(true)
    try {
      const res = await uploadExcel(file)
      onUploaded(res.data)
      setSuccess(`Archivo cargado exitosamente: ${res.data.rows.toLocaleString('es-CO')} registros`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al cargar el archivo')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Cargar Datos de Ventas</h3>

      {/* Current file info */}
      {info && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4 text-sm">
          <p className="font-semibold text-primary">Archivo actual: {info.filename}</p>
          <p className="text-text-secondary text-xs mt-0.5">
            Cargado: {new Date(info.uploaded_at).toLocaleString('es-CO')} ·{' '}
            {info.rows.toLocaleString('es-CO')} registros
            {info.periodo && ` · Período: ${info.periodo}`}
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-accent bg-blue-50' : 'border-gray-200 hover:border-accent hover:bg-blue-50/40'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="text-4xl mb-3">📊</div>
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-secondary">Cargando archivo...</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-text-primary mb-1">
              Arrastra el archivo Excel aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-text-secondary">Formatos permitidos: .xlsx, .xls</p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-sm text-success bg-green-50 rounded-lg px-4 py-2">{success}</p>
      )}
    </div>
  )
}
