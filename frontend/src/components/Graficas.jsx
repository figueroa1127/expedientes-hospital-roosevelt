const PALETA = ['#0b5d64', '#2f7a52', '#c15b4a', '#a3701b', '#3b6ea5', '#7a4fa3', '#5b6a70'];

// Gráfica de barras simple (CSS puro). datos: [{ etiqueta, valor }]
export function GraficaBarras({ datos = [] }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);

  if (datos.length === 0 || datos.every((d) => d.valor === 0)) {
    return <p className="vacio">Sin información para mostrar todavía.</p>;
  }

  return (
    <div className="grafica-barras">
      {datos.map((d, i) => (
        <div className="columna" key={i}>
          <div className="valor-col">{d.valor}</div>
          <div className="pista">
            <div
              className="barra"
              style={{ height: `${Math.max((d.valor / max) * 100, d.valor > 0 ? 4 : 0)}%` }}
              title={`${d.etiqueta}: ${d.valor}`}
            />
          </div>
          <div className="etiqueta-col">{d.etiqueta}</div>
        </div>
      ))}
    </div>
  );
}

// Gráfica de dona (SVG puro). datos: [{ etiqueta, valor }]
export function GraficaDona({ datos = [], unidad = '' }) {
  const filtrados = datos.filter((d) => d.valor > 0);
  const total = filtrados.reduce((s, d) => s + d.valor, 0);

  if (total === 0) {
    return <p className="vacio">Sin información para mostrar todavía.</p>;
  }

  const radio = 60;
  const circunferencia = 2 * Math.PI * radio;
  let acumulado = 0;

  return (
    <div className="grafica-dona">
      <svg viewBox="0 0 150 150" className="dona-svg" role="img">
        <g transform="rotate(-90 75 75)">
          <circle cx="75" cy="75" r={radio} fill="none" stroke="var(--linea)" strokeWidth="18" />
          {filtrados.map((d, i) => {
            const largo = (d.valor / total) * circunferencia;
            const el = (
              <circle
                key={i}
                cx="75"
                cy="75"
                r={radio}
                fill="none"
                stroke={PALETA[i % PALETA.length]}
                strokeWidth="18"
                strokeDasharray={`${largo} ${circunferencia - largo}`}
                strokeDashoffset={-acumulado}
              />
            );
            acumulado += largo;
            return el;
          })}
        </g>
        <text x="75" y="72" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--azul-clinico-oscuro)">
          {total}
        </text>
        <text x="75" y="90" textAnchor="middle" fontSize="10" fill="var(--gris-texto)">
          {unidad}
        </text>
      </svg>
      <div className="dona-leyenda">
        {filtrados.map((d, i) => (
          <div className="fila" key={i}>
            <span className="punto" style={{ background: PALETA[i % PALETA.length] }} />
            <span className="nombre">{d.etiqueta}</span>
            <strong>{d.valor}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// Índice de barras horizontales para listas (diagnósticos frecuentes, etc.)
export function ListaRanking({ datos = [], color = 'var(--azul-clinico)' }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);

  if (datos.length === 0) {
    return <p className="vacio">Sin información para mostrar todavía.</p>;
  }

  return (
    <div className="lista-ranking">
      {datos.map((d, i) => (
        <div className="fila-ranking" key={i}>
          <div className="texto-ranking">
            <span className="nombre">{d.etiqueta}</span>
            <strong>{d.valor}</strong>
          </div>
          <div className="pista-ranking">
            <div className="relleno-ranking" style={{ width: `${(d.valor / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
