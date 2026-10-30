"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Captcha = {
  id: string;
  image: string;
};

type ReciboPendiente = {
  id: number;
  numeroRecibo: string;
  numeroContador: string;
  montoTotal: string | number;
  fechaEmision: string;
};

type ClienteRecibos = {
  id: number;
  nombre: string;
  telefono: string | null;
  direccion: string;
  recibos: ReciboPendiente[];
  totalPendiente: string | number;
};

type Consultation = {
  status: string;
  service: string;
  mode: string;
  consulta: string;
  clientes: ClienteRecibos[];
  totalRecibos: number;
  totalGeneral: string | number;
  checkedAt: string;
};

type PrintTarget = {
  cliente: ClienteRecibos;
  recibo: ReciboPendiente;
};

function formatMoney(value: string | number) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "Q0.00";
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default function Home() {
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Consultation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null);

  const loadCaptcha = useCallback(async (clearFeedback = true) => {
    if (clearFeedback) {
      setError("");
      setResult(null);
    }
    setAnswer("");
    try {
      const response = await fetch("/api/public/captcha", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar el código de seguridad. Intente nuevamente.");
      setCaptcha((await response.json()) as Captcha);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    }
  }, []);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  useEffect(() => {
    if (!printTarget) return;

    document.body.classList.add("print-single");
    const clearPrintMode = () => {
      document.body.classList.remove("print-single");
      setPrintTarget(null);
    };
    window.addEventListener("afterprint", clearPrintMode);
    const timer = window.setTimeout(() => window.print(), 250);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", clearPrintMode);
      document.body.classList.remove("print-single");
    };
  }, [printTarget]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captcha || loading) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/public/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captchaId: captcha.id,
          answer,
          query: query.trim(),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { detail?: string; message?: string }
          | null;
        throw new Error(
          payload?.detail ??
            payload?.message ??
            "No fue posible completar la consulta. Intente con un código nuevo.",
        );
      }
      setResult((await response.json()) as Consultation);
      await loadCaptcha(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
      await loadCaptcha(false);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    Boolean(captcha) &&
    !loading &&
    answer.trim().length === 6 &&
    query.trim().length >= 2;

  return (
    <>
      <div className="gov-bar">
        <div className="container gov-bar-inner">
          <span>Municipalidad</span>
          <span>Sistema de Consulta de Estado de Cuenta</span>
        </div>
      </div>

      <header className="masthead">
        <div className="container masthead-inner">
          <div className="seal" aria-hidden="true">
            OMA
          </div>
          <div className="institution">
            <p className="institution-kicker">Gobierno Municipal</p>
            <h1>Oficina de Agua Potable</h1>
            <p>Sistema de Consulta de Estado de Cuenta</p>
          </div>
          <div className="masthead-status">
            <span className="status-label">Servicio en línea</span>
            <span className="status-value">
              <span className="status-dot" /> Disponible
            </span>
          </div>
        </div>
      </header>

      <main className="container page">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <span>Inicio</span>
          <span>/</span>
          <span>Consulta de recibos</span>
        </nav>

        <section className="page-heading" aria-labelledby="page-title">
          <h2 id="page-title">Consulta de recibos pendientes</h2>
          <p>
            Ingrese el nombre del titular o el número de teléfono registrado para
            consultar el estado de cuenta. La consulta es informativa y no genera
            cargos.
          </p>
        </section>

        <div className="content-grid">
          <section className="form-card" aria-labelledby="form-title">
            <div className="card-title">
              <h3 id="form-title">Datos de consulta</h3>
              <span className="card-badge">Solo lectura</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="consulta">Nombre del titular o teléfono</label>
                <input
                  id="consulta"
                  name="consulta"
                  className="text-input"
                  type="text"
                  autoComplete="name"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ej. Juan Pérez o 5555-1234"
                  maxLength={80}
                  required
                />
                <p className="form-help">
                  Puede ingresar el nombre completo, parte del nombre o el número
                  de teléfono registrado.
                </p>
              </div>

              <div className="form-field">
                <label htmlFor="captcha-answer">Código de seguridad</label>
                <div className="captcha-row">
                  {captcha ? (
                    // La imagen la genera nuestra propia API y se entrega como data URI.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="captcha-image" src={captcha.image} alt="Código de seguridad" />
                  ) : (
                    <div className="captcha-image captcha-placeholder" aria-label="Cargando código de seguridad">
                      ••••••
                    </div>
                  )}
                  <button
                    className="refresh-button"
                    type="button"
                    onClick={() => void loadCaptcha()}
                    disabled={loading}
                    aria-label="Generar un código nuevo"
                  >
                    ↻
                  </button>
                  <input
                    id="captcha-answer"
                    name="captcha-answer"
                    className="text-input"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={6}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value.toUpperCase())}
                    placeholder="Escriba el código"
                    required
                    aria-describedby={error ? "form-error" : undefined}
                  />
                </div>
                <p className="form-help">
                  Escriba los 6 caracteres de la imagen. El código es de un solo uso
                  y vence a los tres minutos.
                </p>
              </div>

              {error && (
                <p className="form-error" id="form-error" role="alert">
                  {error}
                </p>
              )}

              <button className="primary-button" type="submit" disabled={!canSubmit}>
                {loading ? "Consultando..." : "Consultar estado de cuenta"}
              </button>
            </form>
          </section>

          <aside className="notice-panel" aria-labelledby="notice-title">
            <h3 id="notice-title">Información importante</h3>
            <ul>
              <li>La consulta muestra únicamente los recibos pendientes del titular consultado.</li>
              <li>El sistema no realiza cobros ni modifica el estado de cuenta.</li>
              <li>Los montos se expresan en quetzales (GTQ).</li>
              <li>Para efectuar un pago, acuda a la ventanilla de la Oficina de Agua.</li>
            </ul>
            <div className="notice-footer">
              <span className="notice-label">Protección</span>
              <span>Consulta protegida por CAPTCHA</span>
            </div>
          </aside>
        </div>

        {!result && (
          <section className="process-strip" aria-labelledby="process-title">
            <h2 id="process-title">¿Cómo realizar su consulta?</h2>
            <div className="process-grid">
              <div>
                <span>01</span>
                <h3>Ingrese sus datos</h3>
                <p>Escriba el nombre del titular o el número de teléfono registrado.</p>
              </div>
              <div>
                <span>02</span>
                <h3>Verifique el código</h3>
                <p>Complete el código de seguridad para proteger su consulta.</p>
              </div>
              <div>
                <span>03</span>
                <h3>Revise sus recibos</h3>
                <p>Consulte los recibos pendientes y el total a pagar.</p>
              </div>
            </div>
          </section>
        )}

        {result && (
          <section className="statement" aria-live="polite" aria-labelledby="statement-title">
            <div className="statement-header">
              <div>
                <p className="statement-kicker">Estado de cuenta</p>
                <h2 id="statement-title">Recibos pendientes</h2>
                <p className="statement-meta">
                  Consulta realizada el {formatDateTime(result.checkedAt)}
                </p>
              </div>
              <div className="statement-summary">
                <span>
                  {result.totalRecibos} recibo{result.totalRecibos === 1 ? "" : "s"}
                </span>
                <strong>{formatMoney(result.totalGeneral)}</strong>
                <small>Total a pagar</small>
              </div>
            </div>

            {result.clientes.length === 0 ? (
              <div className="empty-state">
                <h3>No se registran adeudos</h3>
                <p>
                  No se encontraron recibos pendientes para “{result.consulta}”.
                  Verifique el nombre o teléfono ingresado e intente nuevamente.
                </p>
              </div>
            ) : (
              result.clientes.map((cliente) => (
                <article className="client-statement" key={cliente.id}>
                  <div className="client-data">
                    <div>
                      <h3>Datos del titular</h3>
                      <dl>
                        <div>
                          <dt>Nombre</dt>
                          <dd>{cliente.nombre}</dd>
                        </div>
                        <div>
                          <dt>Teléfono</dt>
                          <dd>{cliente.telefono ?? "No registrado"}</dd>
                        </div>
                        <div>
                          <dt>Dirección</dt>
                          <dd>{cliente.direccion}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="client-total">
                      <span>Total pendiente del titular</span>
                      <strong>{formatMoney(cliente.totalPendiente)}</strong>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <caption>Detalle de recibos pendientes</caption>
                      <thead>
                        <tr>
                          <th scope="col">Recibo</th>
                          <th scope="col">Contador</th>
                          <th scope="col">Fecha de emisión</th>
                          <th scope="col" className="amount">Monto</th>
                          <th scope="col">Estado</th>
                          <th scope="col">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cliente.recibos.map((recibo) => (
                          <tr key={recibo.id}>
                            <td><strong>{recibo.numeroRecibo}</strong></td>
                            <td>{recibo.numeroContador}</td>
                            <td>{formatDate(recibo.fechaEmision)}</td>
                            <td className="amount">{formatMoney(recibo.montoTotal)}</td>
                            <td><span className="estado">Pendiente</span></td>
                            <td className="row-action">
                              <button
                                type="button"
                                className="row-print-button"
                                onClick={() => setPrintTarget({ cliente, recibo })}
                                aria-label={`Imprimir recibo ${recibo.numeroRecibo}`}
                                title="Imprimir solo este recibo"
                              >
                                Imprimir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))
            )}

            <div className="statement-footer">
              <p>
                Para imprimir únicamente un recibo, utilice el botón <strong>Imprimir</strong>{" "}
                de la fila correspondiente. El estado de cuenta completo también puede
                imprimirse con el botón inferior. Este documento es informativo y no
                sustituye un recibo oficial. Los montos están expresados en quetzales.
              </p>
              <button className="print-button" type="button" onClick={() => window.print()}>
                Imprimir estado de cuenta
              </button>
            </div>
          </section>
        )}

        {printTarget && (
          <section className="print-document" aria-hidden="true">
            <div className="print-header">
              <div className="print-seal">OMA</div>
              <div>
                <p className="print-kicker">Oficina de Agua Potable</p>
                <h1>Recibo pendiente de pago</h1>
                <p>Documento informativo de consulta</p>
              </div>
            </div>

            <div className="print-meta">
              <div>
                <span>No. de recibo</span>
                <strong>{printTarget.recibo.numeroRecibo}</strong>
              </div>
              <div>
                <span>Contador</span>
                <strong>{printTarget.recibo.numeroContador}</strong>
              </div>
              <div>
                <span>Fecha de emisión</span>
                <strong>{formatDate(printTarget.recibo.fechaEmision)}</strong>
              </div>
            </div>

            <div className="print-client">
              <h2>Datos del titular</h2>
              <dl>
                <div><dt>Nombre</dt><dd>{printTarget.cliente.nombre}</dd></div>
                <div><dt>Teléfono</dt><dd>{printTarget.cliente.telefono ?? "No registrado"}</dd></div>
                <div><dt>Dirección</dt><dd>{printTarget.cliente.direccion}</dd></div>
                <div><dt>Estado</dt><dd>Pendiente de pago</dd></div>
              </dl>
            </div>

            <div className="print-amount">
              <span>Total a pagar</span>
              <strong>{formatMoney(printTarget.recibo.montoTotal)}</strong>
            </div>

            <div className="print-note">
              <p>Presente este documento en la ventanilla de la Oficina de Agua Potable para realizar el pago.</p>
              <p>Este documento es informativo y no sustituye el recibo oficial.</p>
            </div>

            <div className="print-footer">
              <span>Consulta realizada el {result ? formatDateTime(result.checkedAt) : ""}</span>
              <span>Oficina de Agua Potable</span>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <strong>Oficina de Agua Potable</strong>
            <span>Consulta de estado de cuenta</span>
          </div>
          <div>
            <span>Horario de atención: lunes a viernes, 8:00 a 16:00</span>
            <span>Consulta en línea disponible las 24 horas</span>
          </div>
        </div>
      </footer>
    </>
  );
}
