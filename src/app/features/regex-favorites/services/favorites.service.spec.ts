import { TestBed } from '@angular/core/testing';
import { FAVORITES_STORAGE_KEY, FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  const create = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(FavoritesService);
  };

  beforeEach(() => localStorage.clear());

  it('salva favoritos no LocalStorage e os recupera em uma nova instância', () => {
    const service = create();
    const saved = service.add({ name: ' Datas ', pattern: String.raw`\d{2}`, flags: 'ig', sampleText: '15/08' });

    expect(saved).toMatchObject({ name: 'Datas', flags: 'gi', sampleText: '15/08' });
    expect(saved.id).toBeTruthy();
    expect(Date.parse(saved.createdAt)).not.toBeNaN();

    const restored = create();
    expect(restored.favorites()).toEqual([saved]);
  });

  it('edita um favorito existente preservando id e data de criação', () => {
    const service = create();
    const saved = service.add({ name: 'A', pattern: 'a', flags: 'g' });
    service.update(saved.id, { name: 'B', pattern: 'b', flags: 'i', sampleText: '' });

    const [updated] = create().favorites();
    expect(updated).toMatchObject({ id: saved.id, createdAt: saved.createdAt, name: 'B', pattern: 'b', flags: 'i' });
    expect(updated.sampleText).toBeUndefined();
  });

  it('exclui favoritos', () => {
    const service = create();
    const a = service.add({ name: 'A', pattern: 'a', flags: '' });
    service.add({ name: 'B', pattern: 'b', flags: '' });
    service.remove(a.id);

    expect(create().favorites().map((f) => f.name)).toEqual(['B']);
  });

  it('ignora dados corrompidos no armazenamento', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{não é json');
    expect(create().favorites()).toEqual([]);

    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([{ name: 'sem campos' }]));
    expect(create().favorites()).toEqual([]);
  });
});
