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

function MapPage() {
  return (
    <div className="map">
      <header className="map-hero">
        <p className="eyebrow">AWS Lab · 學習路線之一</p>
        <h1>在 AWS 上把生成式 AI 用對</h1>
        <p className="lede">
          從 Amazon Bedrock 是什麼、怎麼用 Converse API 呼叫模型，到 token 費用與 Guardrails 防護。每個主題都用實際的請求格式說明，並附可以直接操作的實驗。
        </p>
      </header>

      {TRACKS.map((track) => (
        <section key={track.id} className={`track track-${track.status}`}>
          <div className="track-head">
            <h2>{track.title}</h2>
            {track.status === "planned" ? <span className="pill">規劃中</span> : null}
          </div>
          <p className="muted">{track.description}</p>
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
          ) : null}
        </section>
      ))}

      <section className="track">
        <div className="track-head">
          <h2>其他學習路線</h2>
        </div>
        <p className="muted">AWS Lab 是學習系列中的一條路線，其他路線是各自獨立的網站。</p>
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
  const Content = TOPIC_CONTENT[topicId];

  return (
    <div className="topic-layout">
      <nav className="sidebar" aria-label="主題">
        <a href="#/" className="sidebar-map">
          ← 課程地圖
        </a>
        <ol>
          {READY_TOPICS.map((candidate) => (
            <li key={candidate.id}>
              <a href={topicHref(candidate.id)} aria-current={candidate.id === topicId ? "page" : undefined}>
                {candidate.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="article">
        <p className="eyebrow">
          {topic.trackTitle} · {index + 1} / {READY_TOPICS.length}
        </p>
        <h1>{topic.title}</h1>
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
              <span>下一個</span>
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
    </div>
  );
}

export default function App() {
  const route = parseHash(useHash(), TOPIC_IDS);
  const routeKey = route.kind === "topic" ? route.topicId : "map";

  useEffect(() => {
    window.scrollTo(0, 0);
    const topic = route.kind === "topic" ? READY_TOPICS[topicIndex(route.topicId)] : undefined;
    document.title = topic ? `${topic.title} · AWS Lab` : "AWS Lab";
  }, [routeKey]);

  return (
    <>
      <a className="skip" href="#main">
        跳到主要內容
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <a href="#/" className="brand">
            AWS<span>Lab</span>
          </a>
          <nav className="site-nav" aria-label="網站">
            <a href="#/">課程地圖</a>
            <a href={HUB_URL}>學習總入口 ↗</a>
          </nav>
        </div>
      </header>
      <main id="main" className="page">
        {route.kind === "topic" ? <TopicPage key={routeKey} topicId={route.topicId} /> : <MapPage />}
      </main>
      <footer className="site-footer">
        <p>內容依 2026 年 9 月的 AWS 官方文件整理；model ID、價格與各模型支援的功能請以官方文件為準。</p>
      </footer>
    </>
  );
}
