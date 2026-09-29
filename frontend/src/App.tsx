import { useEffect, useState } from "react";
import { READY_TOPICS, TOPIC_IDS, TRACKS, topicIndex } from "./curriculum";
import { parseHash, topicHref } from "./router";
import { HUB_URL, PEER_SITES } from "./sites";
import { TOPIC_CONTENT } from "./topics";

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

const pad = (n: number) => String(n).padStart(2, "0");

function MapPage() {
  const readyTracks = TRACKS.filter((track) => track.status === "ready");
  const labCount = READY_TOPICS.filter((topic) => topic.lab).length;

  return (
    <div className="map">
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">AWS Lab · 學習路線之一</p>
          <h1>
            在 AWS 上把生成式 AI <em>用對</em>
          </h1>
          <p className="lede">
            先搞懂 Amazon Bedrock 怎麼呼叫模型、怎麼計費與防護，再用 IAM、S3 + CloudFront、Lambda 與 GitHub Actions 把應用安全地放上 AWS。每個主題都用實際的請求格式與設定說明，並附可以直接操作的實驗。
          </p>
          <div className="hero-actions">
            <a className="button" href={topicHref(READY_TOPICS[0].id)}>
              從第一個主題開始<span aria-hidden="true">→</span>
            </a>
            <span className="duration">
              {READY_TOPICS.length} 個主題 · {labCount} 個實驗
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="visual-label">READY TOPICS</div>
          <div className="visual-title">{pad(READY_TOPICS.length)}</div>
          <ul className="visual-tracks">
            {readyTracks.map((track) => (
              <li key={track.id}>
                <span>{track.title}</span>
                <b>{pad(track.topics.length)}</b>
              </li>
            ))}
          </ul>
          <div className="visual-footer">
            <span>{pad(labCount)} LABS</span>
            <b>READY</b>
          </div>
        </div>
      </section>

      <div className="section-heading">
        <p className="kicker">CURRICULUM / 課程地圖</p>
        <h2>選一條路線，沿著主題前進</h2>
      </div>

      {TRACKS.map((track, i) => (
        <section key={track.id} className={`track track-${track.status}`}>
          <div className="track-head">
            <span className="track-no">{pad(i + 1)}</span>
            <h2>{track.title}</h2>
            {track.status === "planned" ? <span className="pill">規劃中</span> : null}
            <p className="muted">{track.description}</p>
          </div>
          {track.topics.length > 0 ? (
            <ol className="topic-list">
              {track.topics.map((topic) => (
                <li key={topic.id}>
                  <a href={topicHref(topic.id)}>
                    <span className="topic-title">{topic.title}</span>
                    <span className="topic-summary">{topic.summary}</span>
                    {topic.lab ? <span className="pill pill-lab">LAB · {topic.lab}</span> : null}
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <div className="track-empty" aria-hidden="true" />
          )}
        </section>
      ))}

      <section className="track">
        <div className="track-head">
          <span className="track-no">↗</span>
          <h2>其他學習路線</h2>
          <p className="muted">AWS Lab 是學習系列中的一條路線，其他路線是各自獨立的網站。</p>
        </div>
        <ul className="sibling-list">
          <li>
            <a href={PEER_SITES.softwareEngineering.url} target="_blank" rel="noopener noreferrer">
              {PEER_SITES.softwareEngineering.title}
            </a>
            <span>Git、API、資料庫、測試、CI/CD、部署</span>
          </li>
          <li>
            <a href={PEER_SITES.guardrail.url} target="_blank" rel="noopener noreferrer">
              {PEER_SITES.guardrail.title}
            </a>
            <span>LLM 應用的安全防護層</span>
          </li>
          <li>
            <a href={PEER_SITES.agent.url} target="_blank" rel="noopener noreferrer">
              {PEER_SITES.agent.title}
            </a>
            <span>REST API、LangChain RAG、WebHook、Dify</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function TopicPage({ topicId }: { topicId: string }) {
  const index = topicIndex(topicId);
  const topic = READY_TOPICS[index];
  const prev = READY_TOPICS[index - 1];
  const next = READY_TOPICS[index + 1];
  const trackTopics = READY_TOPICS.filter((candidate) => candidate.trackId === topic.trackId);
  const Content = TOPIC_CONTENT[topicId];

  return (
    <article className="article">
      <header className="article-head">
        <p className="eyebrow">
          {topic.trackTitle} · {trackTopics.indexOf(topic) + 1} / {trackTopics.length}
        </p>
        <h1>{topic.title}</h1>
      </header>
      <Content />

      <nav className="pager" aria-label="上一個與下一個主題">
        {prev ? (
          <a href={topicHref(prev.id)} className="pager-prev">
            <span>上一個</span>
            {prev.title}
          </a>
        ) : (
          <a href="#/" className="pager-prev">
            <span>回到</span>
            課程地圖
          </a>
        )}
        {next ? (
          <a href={topicHref(next.id)} className="pager-next">
            <span>{next.trackId === topic.trackId ? "下一個" : `下一條路線：${next.trackTitle}`}</span>
            {next.title}
          </a>
        ) : (
          <a href="#/" className="pager-next">
            <span>完成這條路線</span>
            回課程地圖
          </a>
        )}
      </nav>
    </article>
  );
}

export default function App() {
  const route = parseHash(useHash(), TOPIC_IDS);
  const routeKey = route.kind === "topic" ? route.topicId : "map";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
    const topic = route.kind === "topic" ? READY_TOPICS[topicIndex(route.topicId)] : undefined;
    document.title = topic ? `${topic.title} · AWS Lab` : "AWS Lab";
  }, [routeKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = route.kind === "topic" ? READY_TOPICS[topicIndex(route.topicId)] : undefined;

  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        跳到主要內容
      </a>
      <aside className={`sidebar${menuOpen ? " open" : ""}`} id="sidebar">
        <a href="#/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            AW
          </span>
          <span className="brand-text">
            <b>AWS Lab</b>
            <small>GENAI ON AWS</small>
          </span>
        </a>
        <p className="nav-label">目錄 / CONTENTS</p>
        <nav aria-label="課程地圖">
          <ol>
            <li>
              <a href="#/" aria-current={route.kind === "map" ? "page" : undefined}>
                <span>00</span>課程地圖
              </a>
            </li>
          </ol>
        </nav>
        {TRACKS.filter((track) => track.status === "ready").map((track) => (
          <div key={track.id} className="sidebar-track">
            <p className="nav-label">{track.title}</p>
            <nav aria-label={track.title}>
              <ol>
                {track.topics.map((candidate, i) => (
                  <li key={candidate.id}>
                    <a
                      href={topicHref(candidate.id)}
                      aria-current={current && candidate.id === current.id ? "page" : undefined}
                    >
                      <span>{pad(i + 1)}</span>
                      {candidate.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        ))}
      </aside>
      <button
        type="button"
        className={`menu-scrim${menuOpen ? " open" : ""}`}
        aria-label="關閉選單"
        tabIndex={-1}
        onClick={() => setMenuOpen(false)}
      />

      <div className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="menu-button"
            aria-label="開啟選單"
            aria-expanded={menuOpen}
            aria-controls="sidebar"
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
          <div className="breadcrumb">
            <span>AWS LAB</span>
            <i>/</i>
            <b>{current ? current.title : "MAP"}</b>
          </div>
          <a className="atlas-link" href={HUB_URL} aria-label="返回 Learning Atlas 學習總入口">
            Learning Atlas ↗
          </a>
        </header>
        <main id="main" className="page">
          {route.kind === "topic" ? <TopicPage key={routeKey} topicId={route.topicId} /> : <MapPage />}
        </main>
        <footer className="site-footer">
          <p>內容依 2026 年 9 月的 AWS 官方文件整理；model ID、價格與各模型支援的功能請以官方文件為準。</p>
        </footer>
      </div>
    </div>
  );
}
