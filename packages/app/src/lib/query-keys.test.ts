import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

describe('queryKeys', () => {
  it('builds catalog/chart keys with their params', () => {
    expect(queryKeys.charts.catalog(50)).toEqual(['charts', 'catalog', 50])
    expect(queryKeys.charts.genre('14')).toEqual(['charts', 'genre', '14'])
  })

  it('builds search keys', () => {
    expect(queryKeys.search.results('daft punk')).toEqual([
      'search',
      'results',
      'daft punk',
    ])
    expect(queryKeys.search.hints('da')).toEqual(['search', 'hints', 'da'])
  })

  it('builds library keys', () => {
    expect(queryKeys.library.songs(0)).toEqual(['library', 'songs', 0])
    expect(queryKeys.library.albums(100)).toEqual(['library', 'albums', 100])
    expect(queryKeys.library.artists()).toEqual(['library', 'artists'])
  })

  it('builds nested last.fm keys', () => {
    expect(queryKeys.lastfm.artist('Air')).toEqual(['lastfm', 'artist', 'Air'])
    expect(queryKeys.lastfm.similarArtists('Air')).toEqual([
      'lastfm',
      'artist',
      'Air',
      'similar',
    ])
    expect(queryKeys.lastfm.track('Air', 'Playground Love')).toEqual([
      'lastfm',
      'track',
      'Air',
      'Playground Love',
    ])
  })

  it('produces distinct keys for distinct params', () => {
    expect(queryKeys.charts.catalog(10)).not.toEqual(
      queryKeys.charts.catalog(20),
    )
    expect(queryKeys.albums.detail('a')).not.toEqual(
      queryKeys.albums.detail('b'),
    )
  })
})
