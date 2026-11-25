const controls = document.querySelector<HTMLElement>('[data-catalogue-tools]');
if (controls) {
  controls.hidden = false;
  const grid = document.querySelector<HTMLElement>('#product-grid')!;
  const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-product]'));
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-category-filter]'));
  const search = document.querySelector<HTMLInputElement>('#product-search')!;
  const sort = document.querySelector<HTMLSelectElement>('#product-sort')!;
  const clear = document.querySelector<HTMLButtonElement>('#clear-filters')!;
  const params = new URLSearchParams(window.location.search);
  let category = params.get('category') || 'all';
  if (!buttons.some(button => button.dataset.categoryFilter === category)) category = 'all';
  search.value = params.get('q') || '';
  const sortValue = params.get('sort') || 'featured';
  if (['featured', 'low', 'high', 'name'].includes(sortValue)) sort.value = sortValue;
  function update() {
    const term = search.value.trim().toLocaleLowerCase('en-GB');
    const ordered = [...cards];
    if (sort.value === 'name') ordered.sort((a, b) => a.dataset.name!.localeCompare(b.dataset.name!, 'en-GB'));
    if (['low', 'high'].includes(sort.value)) ordered.sort((a, b) => {
      if (!a.dataset.price) return b.dataset.price ? 1 : 0;
      if (!b.dataset.price) return -1;
      return (Number(a.dataset.price) - Number(b.dataset.price)) * (sort.value === 'high' ? -1 : 1);
    });
    let count = 0;
    ordered.forEach(card => {
      card.hidden = (category !== 'all' && card.dataset.category !== category) || !card.dataset.name!.toLocaleLowerCase('en-GB').includes(term);
      if (!card.hidden) count++;
      grid.append(card);
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.categoryFilter === category)));
    document.querySelector('#product-count')!.textContent = `${count} ${count === 1 ? 'piece' : 'pieces'}`;
    (document.querySelector('#no-results') as HTMLElement).hidden = count > 0;
    clear.hidden = category === 'all' && !term && sort.value === 'featured';
    const next = new URL(window.location.href);
    for (const key of ['category', 'q', 'sort']) next.searchParams.delete(key);
    if (category !== 'all') next.searchParams.set('category', category);
    if (term) next.searchParams.set('q', search.value.trim());
    if (sort.value !== 'featured') next.searchParams.set('sort', sort.value);
    history.replaceState(null, '', next);
  }
  function reset() { category = 'all'; search.value = ''; sort.value = 'featured'; update(); }
  buttons.forEach(button => button.addEventListener('click', () => { category = button.dataset.categoryFilter!; update(); }));
  search.addEventListener('input', update);
  sort.addEventListener('change', update);
  clear.addEventListener('click', reset);
  document.querySelector('#reset-search')!.addEventListener('click', reset);
  update();
}
