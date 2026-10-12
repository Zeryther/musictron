import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  readonly targets = new Set<Element>()
  disconnected = false

  constructor(private readonly callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this)
  }

  observe(target: Element) {
    this.targets.add(target)
  }

  disconnect() {
    this.disconnected = true
    this.targets.clear()
  }

  intersect() {
    const entries = [...this.targets].map(
      (target) =>
        ({ target, isIntersecting: true }) as IntersectionObserverEntry,
    )
    this.callback(entries, this as unknown as IntersectionObserver)
  }
}

function activeObservers() {
  return MockIntersectionObserver.instances.filter((o) => !o.disconnected)
}

interface HarnessProps {
  loading?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  isFetchNextPageError?: boolean
  fetchNextPage: () => void
}

function Harness({
  loading = false,
  hasNextPage = true,
  isFetchingNextPage = false,
  isFetchNextPageError = false,
  fetchNextPage,
}: HarnessProps) {
  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  })
  if (loading) return <p>Loading</p>
  return <div ref={sentinelRef} data-testid="sentinel" />
}

beforeEach(() => {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

describe('useInfiniteScroll', () => {
  it('attaches once the sentinel mounts after a loading state', () => {
    const fetchNextPage = vi.fn()
    const { rerender, getByTestId } = render(
      <Harness loading fetchNextPage={fetchNextPage} />,
    )
    expect(activeObservers()).toHaveLength(0)

    rerender(<Harness fetchNextPage={fetchNextPage} />)

    const [observer] = activeObservers()
    expect(observer.targets.has(getByTestId('sentinel'))).toBe(true)
    act(() => observer.intersect())
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('does not observe while a page is loading or there are no more pages', () => {
    const fetchNextPage = vi.fn()
    const { rerender } = render(
      <Harness isFetchingNextPage fetchNextPage={fetchNextPage} />,
    )
    expect(activeObservers()).toHaveLength(0)

    rerender(<Harness hasNextPage={false} fetchNextPage={fetchNextPage} />)
    expect(activeObservers()).toHaveLength(0)
  })

  it('pauses after a failed page instead of retrying in a loop', () => {
    const fetchNextPage = vi.fn()
    render(<Harness isFetchNextPageError fetchNextPage={fetchNextPage} />)
    expect(activeObservers()).toHaveLength(0)
  })

  it('re-observes after a page finishes so visible sentinels keep loading', () => {
    const fetchNextPage = vi.fn()
    const { rerender } = render(<Harness fetchNextPage={fetchNextPage} />)
    act(() => activeObservers()[0].intersect())

    rerender(<Harness isFetchingNextPage fetchNextPage={fetchNextPage} />)
    expect(activeObservers()).toHaveLength(0)

    rerender(<Harness fetchNextPage={fetchNextPage} />)
    act(() => activeObservers()[0].intersect())
    expect(fetchNextPage).toHaveBeenCalledTimes(2)
  })
})
