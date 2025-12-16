import { memo, useMemo } from 'react';
import { List, RowComponentProps } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight?: number;
  className?: string;
  overscanCount?: number;
}

/**
 * Virtualized list component for rendering large lists efficiently
 * Only renders visible items + overscan buffer
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight = 600,
  className = '',
  overscanCount = 3,
}: VirtualizedListProps<T>) {
  const Row = memo(({ index, style }: RowComponentProps) => {
    const item = items[index];
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  });

  Row.displayName = 'VirtualizedRow';

  // Calculate total height
  const totalHeight = useMemo(() => {
    return Math.min(items.length * itemHeight, containerHeight);
  }, [items.length, itemHeight, containerHeight]);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-muted-foreground">No items to display</p>
      </div>
    );
  }

  return (
    <List
      height={totalHeight}
      rowCount={items.length}
      rowHeight={itemHeight}
      style={{ width: '100%' }}
      overscanCount={overscanCount}
      className={className}
      rowComponent={Row}
    />
  );
}
