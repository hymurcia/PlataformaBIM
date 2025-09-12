export default function Footer() {
  return (
    <footer className="bg-dark text-light py-4 mt-5">
      <div className="container">
        <div className="row">
          
          {/* Información de la Plataforma */}
          <div className="col-md-4 mb-3">
            <h5>PLATAFOMA BIM</h5>
            <p className="small">
              Plataforma web para gestión integral de mantenimentos basado en BIM, ofreciendo herramientas para el
              reporte de incidentes, gestio de activos y mantenimientos.
            </p>
          </div>

          {/* Enlaces útiles */}
          <div className="col-md-4 mb-3">
            <h5>Comentarios</h5>
            <ul className="list-unstyled small">
              <li><a href="/sobre" className="text-light text-decoration-none">Sobre Nosotros</a></li>
              <li><a href="/comentarios" className="text-light text-decoration-none">Comentarios</a></li>
            </ul>
          </div>

          {/* Contacto */}
          <div className="col-md-4 mb-3">
            <h5>Contáctanos</h5>
            <p className="small mb-1">📧 soporte@plataforma.com</p>
            <p className="small mb-1">📞 +57 300 123 4567</p>
            <p className="small">📍 Facatativa, Colombia</p>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="text-center border-top pt-3 mt-3 small">
          © {new Date().getFullYear()} Plataforma BIM — Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
