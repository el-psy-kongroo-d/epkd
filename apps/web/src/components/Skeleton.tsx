import type { CSSProperties } from "react";

function SkeletonBar({ width = "100%", height = 12 }: { width?: string | number; height?: number }) {
  const style: CSSProperties = { width, height };
  return <span className="skeleton-bar" style={style} />;
}

export function EntriesSkeleton() {
  return (
    <ul className="entries skeleton" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i}>
          <span className="no">
            <SkeletonBar width={20} height={12} />
          </span>
          <div className="body">
            <div className="title">
              <SkeletonBar width="60%" height={15} />
            </div>
            <div className="meta">
              <SkeletonBar width="35%" height={11} />
            </div>
            <div className="excerpt">
              <SkeletonBar width="92%" height={12} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ArchiveSkeleton() {
  return (
    <table className="archive skeleton" aria-hidden="true">
      <tbody>
        {Array.from({ length: 6 }, (_, i) => (
          <tr key={i}>
            <td className="no">
              <SkeletonBar width={20} height={12} />
            </td>
            <td className="title">
              <SkeletonBar width="70%" height={13} />
            </td>
            <td className="date">
              <SkeletonBar width={64} height={11} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PostSkeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <div className="post-title">
        <SkeletonBar width="70%" height={22} />
      </div>
      <div className="post-meta">
        <SkeletonBar width="40%" height={11} />
      </div>
      <div className="post-body">
        {Array.from({ length: 4 }, (_, i) => (
          <p key={i}>
            <SkeletonBar width={i === 3 ? "55%" : "100%"} height={12} />
          </p>
        ))}
      </div>
    </div>
  );
}
