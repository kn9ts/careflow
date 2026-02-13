/**
 * Loading Components
 * Reusable loading states and skeletons
 */

import { Loader2 } from 'lucide-react';

/**
 * Spinner loading component
 */
export function Spinner({ size = 'md', className = '', text }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`spinner-container ${className}`}>
      <div className={`spinner ${sizeClasses[size]}`}>
        <Loader2 className="w-full h-full text-primary-blue animate-spin" />
      </div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
}

/**
 * Full page loading spinner
 */
export function PageLoader({ text = 'Loading...', className = '' }) {
  return (
    <div className={`page-loader ${className}`}>
      <div className="page-loader-content">
        <Spinner size="lg" />
        {text && <p className="page-loader-text">{text}</p>}
      </div>
    </div>
  );
}

/**
 * Button loading state
 */
export function ButtonLoader({ className = '' }) {
  return (
    <span className={`inline-flex items-center justify-center animate-spin ${className}`}>
      <Loader2 size={16} />
    </span>
  );
}

/**
 * Skeleton loader component
 */
export function Skeleton({ className = '', count = 1, height, width }) {
  return (
    <div className={`skeleton-wrapper ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            height: height || '1rem',
            width: width || '100%',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton for dashboard cards
 */
export function CardSkeleton({ className = '' }) {
  return (
    <div className={`card-skeleton ${className}`}>
      <div className="card-skeleton-header">
        <Skeleton height="1.25rem" width="60%" />
      </div>
      <div className="card-skeleton-body">
        <Skeleton height="3rem" />
        <div className="card-skeleton-row">
          <Skeleton height="0.75rem" width="30%" />
          <Skeleton height="0.75rem" width="40%" />
        </div>
        <div className="card-skeleton-row">
          <Skeleton height="0.75rem" width="25%" />
          <Skeleton height="0.75rem" width="35%" />
        </div>
      </div>
    </div>
  );
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({ rows = 5, columns = 4, className = '' }) {
  return (
    <div className={`table-skeleton ${className}`}>
      <div className="table-skeleton-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="1.25rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="table-skeleton-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="1rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Inline loading bar
 */
export function LoadingBar({ progress = 0, className = '' }) {
  return (
    <div className={`loading-bar ${className}`}>
      <div className="loading-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
    </div>
  );
}

/**
 * Dots loading animation
 */
export function DotsLoader({ className = '', color = '#3b82f6' }) {
  return (
    <div className={`dots-loader ${className}`}>
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color, animationDelay: '-0.32s' }}
      />
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color, animationDelay: '-0.16s' }}
      />
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    </div>
  );
}
