/* TeleCod Navbar - shared component */
(function(){
  const btn=document.getElementById('navMenuBtn');
  const nav=document.querySelector('.nav-links');
  btn?.addEventListener('click',()=>nav?.classList.toggle('show'));

  const path=location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.nav-links a').forEach(a=>{
    if(a.getAttribute('href')?.endsWith(path)) a.classList.add('active');
  });
})();