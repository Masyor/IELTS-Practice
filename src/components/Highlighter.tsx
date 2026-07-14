import React, { useState, useEffect, useRef } from 'react';

interface HighlighterProps {
  content: string;
  id: string;
  inline?: boolean;
}

export default function Highlighter({ content, id, inline }: HighlighterProps) {
  const [highlights, setHighlights] = useState<{ start: number; end: number }[]>([]);
  const containerRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`highlights_${id}`);
    if (saved) setHighlights(JSON.parse(saved));
  }, [id]);

  const saveHighlights = (newH: {start: number, end: number}[]) => {
    setHighlights(newH);
    localStorage.setItem(`highlights_${id}`, JSON.stringify(newH));
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;

    let start = 0;
    let end = 0;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(containerRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    start = preCaretRange.toString().length;
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    end = preCaretRange.toString().length;

    if (start !== end && start < end) {
      const newH = [...highlights, { start, end }];
      saveHighlights(newH);
      selection.removeAllRanges();
    }
  };

  const removeHighlight = (index: number) => {
    const newH = [...highlights];
    newH.splice(index, 1);
    saveHighlights(newH);
  };

  const renderContent = () => {
    if (!content) return null;
    if (highlights.length === 0) return content;
    
    const merged = [...highlights].sort((a,b) => a.start - b.start).reduce((acc, curr) => {
      if (acc.length === 0) return [curr];
      const prev = acc[acc.length - 1];
      if (curr.start <= prev.end) {
        prev.end = Math.max(prev.end, curr.end);
        return acc;
      } else {
        return [...acc, curr];
      }
    }, [] as {start: number, end: number}[]);

    const nodes = [];
    let lastIndex = 0;
    merged.forEach((h, i) => {
      if (h.start > lastIndex) {
        nodes.push(<span key={`text-${i}`}>{content.substring(lastIndex, h.start)}</span>);
      }
      nodes.push(
        <mark 
          key={`mark-${i}`} 
          className="bg-yellow-200 cursor-pointer hover:bg-yellow-300 transition-colors" 
          onClick={() => removeHighlight(i)} 
          title="Click to remove highlight"
        >
          {content.substring(h.start, h.end)}
        </mark>
      );
      lastIndex = h.end;
    });
    if (lastIndex < content.length) {
      nodes.push(<span key={`text-end`}>{content.substring(lastIndex)}</span>);
    }
    return nodes;
  };

  const Tag: any = inline ? 'span' : 'div';

  return (
    <Tag 
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className={inline ? "font-serif text-gray-800" : "prose prose-blue max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-serif"}
    >
      {renderContent()}
    </Tag>
  );
}
