document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('f');
  const access = document.getElementById('access');
  const price = document.getElementById('price');
  const title = document.getElementById('title');
  const slug = document.getElementById('slug');
  const thumb = document.getElementById('thumb');
  const type = document.getElementById('type');
  const desc = document.getElementById('desc');
  const content = document.getElementById('content');

  const syncPrice = () => {
    if (!access || !price) return;
    const paid = access.value === 'paid';
    price.required = paid;
    if (!paid) price.value = '0';
  };
  access?.addEventListener('change', syncPrice);
  syncPrice();

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const user = await TC.user();
    if (!user) return location.replace('login.html');
    if (!window.sb) return TC.toast('Database belum dikonfigurasi.');

    const payload = {
      seller_id: user.id,
      creator_id: user.id,
      title: title?.value.trim(),
      slug: slug?.value.trim(),
      price: Number(price?.value || 0),
      thumbnail_url: thumb?.value.trim() || null,
      type: type?.value,
      access_type: access?.value,
      description: desc?.value.trim() || '',
      content: content?.value || '',
      status: 'published'
    };
    if (!payload.title || !payload.slug) return TC.toast('Judul dan slug wajib diisi.');
    const { error } = await sb.from('products').insert(payload);
    TC.toast(error ? error.message : 'Produk berhasil dipublikasikan ke Marketplace.');
    if (!error) setTimeout(() => location.replace('my-products.html'), 700);
  });
});
