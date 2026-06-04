import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { clearSession } from './session.ts'

/**
 * Custom hook que centraliza y unifica la lógica de cierre de sesión en la aplicación.
 * 
 * Muestra un diálogo de confirmación interactivo utilizando SweetAlert2. Si el usuario confirma,
 * limpia los tokens y metadatos de sesión guardados en el almacenamiento local (`localStorage`)
 * y redirige de forma segura a la pantalla principal.
 * 
 * @returns {() => Promise<void>} Función asíncrona para iniciar el proceso de cierre de sesión.
 * 
 * @example
 * ```tsx
 * const handleLogout = useLogout();
 * return <button onClick={handleLogout}>Cerrar sesión</button>;
 * ```
 */
export function useLogout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Cerrar sesion',
      text: 'Se cerrara tu sesion actual en este dispositivo.',
      showCancelButton: true,
      confirmButtonText: 'Si, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2c5f7c',
      cancelButtonColor: '#7f8c8d',
    })

    if (!result.isConfirmed) {
      return
    }

    clearSession()
    navigate('/', { replace: true })
  }

  return handleLogout
}
