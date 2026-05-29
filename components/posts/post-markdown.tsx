import type { ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type PostMarkdownProps = {
  body: string;
};

function normalizeYouTubeVideoId(videoId: string | null) {
  if (!videoId) {
    return null;
  }

  return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
}

function extractYouTubeVideoId(urlString: string) {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const [candidate] = url.pathname.split('/').filter(Boolean);
      return normalizeYouTubeVideoId(candidate ?? null);
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') {
        return normalizeYouTubeVideoId(url.searchParams.get('v'));
      }

      const [section, candidate] = url.pathname.split('/').filter(Boolean);
      if (section === 'shorts' || section === 'embed' || section === 'live') {
        return normalizeYouTubeVideoId(candidate ?? null);
      }
    }
  } catch {
    return null;
  }

  return null;
}

function extractTextFromChildren(children: ReactNode) {
  if (typeof children === 'string') {
    return children;
  }

  if (Array.isArray(children)) {
    return children.filter((child): child is string => typeof child === 'string').join('');
  }

  return '';
}

export function PostMarkdown({ body }: PostMarkdownProps) {
  return (
    <div className="space-y-3 text-base leading-7 break-words">
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>,
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          a: ({ href, children }) => {
            if (!href) {
              return <>{children}</>;
            }

            const videoId = extractYouTubeVideoId(href);
            if (!videoId) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="break-all text-blue-700 underline hover:text-blue-800"
                >
                  {children}
                </a>
              );
            }

            const label = extractTextFromChildren(children).trim() || 'YouTube 동영상';
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="my-2 block overflow-hidden rounded-lg border border-[#e8e8e8] bg-white no-underline transition hover:border-[#fee500]"
              >
                <img src={thumbnailUrl} alt={`${label} 썸네일`} loading="lazy" className="h-auto w-full bg-black" />
                <span className="flex items-center gap-2 px-3 py-2 text-sm text-[#3c1e1e]">
                  <span aria-hidden="true">▶️</span>
                  <span className="truncate">YouTube 미리보기 열기</span>
                </span>
              </a>
            );
          },
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-zinc-300 pl-4 text-zinc-700">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-sm text-zinc-100">
              {children}
            </pre>
          ),
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
