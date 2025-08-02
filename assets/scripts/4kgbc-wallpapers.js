const imagesPerPage = 10;
const totalImages = 100;
const gallery = document.getElementById("wallpaper-gallery");
const pagination = document.getElementById("pagination");

// 检查某个编号的图片是否为 JPG 或 PNG
function getImagePath(index) {
  const pngPath = `/assets/images/4kgbc-${index}.png`;
  const jpgPath = `/assets/images/4kgbc-${index}.jpg`;

  const img = new Image();
  img.src = pngPath;

  return new Promise((resolve) => {
    img.onload = () => resolve({path: pngPath, isFound: true});
    img.onerror = () => {
      // 尝试加载 jpg
      const fallbackImg = new Image();
      fallbackImg.src = jpgPath;
      fallbackImg.onload = () => resolve({path: jpgPath, isFound: true});
      fallbackImg.onerror = () => resolve({path: null, isFound: false});
    };
  });
}

async function renderPage(page) {
  gallery.innerHTML = "";

  const start = (page - 1) * imagesPerPage + 1;
  const end = Math.min(start + imagesPerPage - 1, totalImages);

  const promises = [];
  for (let i = start; i <= end; i++) {
    promises.push(getImagePath(i).then(result => ({...result, index: i})));
  }

  const results = await Promise.all(promises);

  for (const {path, isFound, index} of results) {
    if (!isFound) continue;

    const imgContainer = document.createElement("div");
    imgContainer.className = "image-container";

    const img = new Image();
    img.src = path;
    img.alt = `Wallpaper ${index}`;

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      const info = document.createElement("div");
      info.className = "image-info";

      const title = document.createElement("div");
      title.className = "image-title";
      title.textContent = `Wallpaper #${index}`;

      const resolution = document.createElement("div");
      resolution.textContent = `${width} × ${height}`;

      info.appendChild(title);
      info.appendChild(resolution);
      imgContainer.appendChild(img);
      imgContainer.appendChild(info);
      gallery.appendChild(imgContainer);
    };
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