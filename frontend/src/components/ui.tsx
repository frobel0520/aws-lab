import type { ReactNode } from "react";

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section className="section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Table({ head, rows, highlight }: { head: ReactNode[]; rows: ReactNode[][]; highlight?: number }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {head.map((cell, index) => (
              <th key={index} scope="col" className={index === highlight ? "hl" : undefined}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={index}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return <aside className={`note note-${tone}`}>{children}</aside>;
}

export function Lab({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="lab" aria-label={`實驗：${title}`}>
      <div className="lab-head">
        <span className="lab-tag">LAB</span>
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function PeerLink({ href, site, children }: { href: string; site: string; children: ReactNode }) {
  return (
    <a className="peer" href={href} target="_blank" rel="noopener noreferrer">
      <span className="peer-site">{site}</span>
      <span className="peer-text">{children}</span>
    </a>
  );
}
