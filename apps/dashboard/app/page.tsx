import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>Panel editorial</h1>
      <p className="nh-muted">Gestiona artículos, opiniones, categorías y autores del contenido publicado.</p>
      <div className="nh-row">
        <Link className="nh-btn primary" href="/login">
          Acceder
        </Link>
        <Link className="nh-btn" href="/articles">
          Artículos
        </Link>
        <Link className="nh-btn" href="/opinions">
          Opiniones
        </Link>
        <Link className="nh-btn" href="/categories">
          Categorías
        </Link>
        <Link className="nh-btn" href="/authors">
          Autores
        </Link>
      </div>
    </main>
  );
}
