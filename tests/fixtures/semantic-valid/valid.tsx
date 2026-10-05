import React, { useState } from "react";

type Row<T> = { id: string; value: T };

// Valid TSX: fragments, generic components, nested ternaries, entities, and
// template-literal props all break naive angle-bracket matching.
export function List<T>({ rows }: { rows: Row<T>[] }) {
  const [query, setQuery] = useState<string>("");
  const summary = rows.length > 0 ? <b>{rows.length}</b> : <i>none</i>;
  return (
    <>
      <ul data-query={query} onChange={(e) => setQuery(e.target.value)}>
        {rows.map((row) => (
          <li key={row.id} title={`row ${row.id} & more`}>
            {row.value} {summary} <>{" "}</>
            {row.value > 3 && <span>big</span>}
          </li>
        ))}
      </ul>
      {/* a comment with <angle> brackets that is not code */}
      <p>a &amp; b &lt; c</p>
    </>
  );
}
