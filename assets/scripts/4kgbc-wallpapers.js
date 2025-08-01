const imagesPerPage = 10;
const totalImages = 100;
const gallery = document.getElementById("wallpaper-gallery");
const pagination = document.getElementById("pagination");

function renderPage(page) {
  gallery.innerHTML = "";

  const start = (page - 1) * imagesPerPage + 1;
  const end = Math.min(start + imagesPerPage - 1, totalImages);

  for (let i = start; i <= end; i++) {
    const img = document.createElement("img");
    img.src = `/assets/images/4kgbc-${i}.png`;
    img.alt = `Wallpaper ${i}`;
    gallery.appendChild(img);
  }

  renderPagination(page);
}

function renderPagination(currentPage) {
  pagination.innerHTML = "";

  const prev = document.createElement("button");
  prev.textContent = "Previous";
  prev.disabled = currentPage === 1;
  prev.onclick = () => renderPage(currentPage - 1);
  pagination.appendChild(prev);

  for (let i = 1; i <= Math.ceil(totalImages / imagesPerPage); i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => renderPage(i);
    pagination.appendChild(btn);
  }

  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = currentPage === Math.ceil(totalImages / imagesPerPage);
  next.onclick = () => renderPage(currentPage + 1);
  pagination.appendChild(next);
}

// 初始化
renderPage(1);
