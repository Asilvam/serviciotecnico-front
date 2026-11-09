export default function AppFooter() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>Servicio Tecnico</span>
        <span className="footer-version">
          <span>v{__APP_VERSION__}</span>
          <span title={__BUILD_COMMIT__ ? `Commit: ${__BUILD_COMMIT__}` : 'Compilación local sin información de Git'}>Build {__BUILD_ID__}</span>
        </span>
      </div>
    </footer>
  )
}
