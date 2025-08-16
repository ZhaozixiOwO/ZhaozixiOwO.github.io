const imagesPerPage = 10;
const gallery = document.getElementById("wallpaper-gallery");
const pagination = document.getElementById("pagination");

let groups = [];
let totalImageCount = 0;

fetch("/assets/images/4kgbc-wallpapers.json")
  .then(res => res.json())
  .then(data => {
    groups = data.groups; // 每组已经排好顺序
    totalImageCount = data.totalImageCount;
    renderPage(1);
  });

function getImagePaths(filename) {
  const nameWithoutExt = filename ? filename.split(".")[0] : null;
  if (!nameWithoutExt) return null;

  const pngPath = `/assets/images/${nameWithoutExt}.png`;
  const jpgPath = `/assets/images/${nameWithoutExt}.jpg`;
  const thumbPath = `/assets/images/thumbnail/${nameWithoutExt}-thumb.jpg`;

  return {
    thumb: thumbPath,
    originalPNG: pngPath,
    originalJPG: jpgPath,
    baseName: nameWithoutExt,
  };
}

async function renderPage(page) {
  gallery.innerHTML = "";

  const group = groups.find(g => g.groupNumber === page);
  if (!group) return;

  for (const filename of group.images) {
    if (!filename) continue; // 跳过补齐的 null

    const {thumb, originalPNG, originalJPG, baseName} = getImagePaths(filename);

    const container = document.createElement("div");
    container.className = "image-container";

    const img = new Image();
    img.src = thumb;
    img.alt = baseName;
    img.loading = "lazy";
    img.className = "thumbnail";

    const info = document.createElement("div");
    info.className = "image-info";

    const title = document.createElement("div");
    title.className = "image-title";
    title.textContent = baseName; // 显示真实文件名，例如 4kgbc-1

    const resolution = document.createElement("div");
    resolution.textContent = "加载中...";

    // 懒加载原图用于测量尺寸
    const fullImg = new Image();
    fullImg.src = originalPNG;
    fullImg.onload = () => {
      resolution.textContent = `${fullImg.naturalWidth} × ${fullImg.naturalHeight}`;
    };
    fullImg.onerror = () => {
      const fallback = new Image();
      fallback.src = originalJPG;
      fallback.onload = () => {
        resolution.textContent = `${fallback.naturalWidth} × ${fallback.naturalHeight}`;
      };
      fallback.onerror = () => {
        resolution.textContent = "尺寸未知";
      };
    };

    info.appendChild(title);
    info.appendChild(resolution);

    // 点击缩略图可查看原图
    img.onclick = () => {
      window.open(originalPNG, "_blank");
    };

    container.appendChild(img);
    container.appendChild(info);
    gallery.appendChild(container);
  }

  renderPagination(page);
}

function renderPagination(currentPage) {
  pagination.innerHTML = "";
  const totalPages = groups.length;

  const prev = document.createElement("button");
  prev.textContent = "Previous";
  prev.disabled = currentPage === 1;
  prev.onclick = () => renderPage(currentPage - 1);
  pagination.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => renderPage(i);
    pagination.appendChild(btn);
  }

  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = currentPage === totalPages;
  next.onclick = () => renderPage(currentPage + 1);
  pagination.appendChild(next);
}

// 初始化
renderPage(1);


//-------------------------- 懒加载 --------------------------//

// const itemsPerPage = 10;
// let currentPage = 1;
// let images = [];
//
// const observer = new IntersectionObserver(
//   (entries) => {
//     entries.forEach((entry) => {
//       if (entry.isIntersecting) {
//         const img = entry.target;
//         const fullSrc = img.dataset.fullsrc;
//         if (fullSrc && img.src !== fullSrc) {
//           img.src = fullSrc;
//           img.onload = () => {
//             img.classList.add("loaded");
//             const resolution = img.parentElement.querySelector(".wallpaper-resolution");
//             resolution.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
//           };
//           observer.unobserve(img);
//         }
//       }
//     });
//   },
//   { rootMargin: "200px", threshold: 0.1 }
// );
//
// async function getThumbnailPath(filename, ext) {
//   const thumbPath = `/assets/images/${filename}-thumb.${ext}`;
//   const img = new Image();
//   img.src = thumbPath;
//   return new Promise((resolve) => {
//     img.onload = () => resolve({ path: thumbPath, isFound: true });
//     img.onerror = () => resolve({ path: null, isFound: false });
//   });
// }
//
// async function createWallpaperElement(file, index) {
//   const filename = file.split(".")[0];
//   const ext = file.split(".")[1];
//   const fullSrc = `/assets/images/${file}`;
//   const { path: thumbPath, isFound } = await getThumbnailPath(filename, ext);
//   const imgSrc = isFound ? thumbPath : fullSrc;
//
//   const container = document.createElement("div");
//   container.className = "wallpaper-item";
//
//   const img = document.createElement("img");
//   img.src = imgSrc;
//   img.alt = filename;
//   img.dataset.fullsrc = fullSrc;
//   img.loading = "lazy";
//   img.onload = () => {
//     img.classList.add("loaded");
//     resolution.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
//   };
//   observer.observe(img);
//
//   const title = document.createElement("div");
//   title.className = "wallpaper-title";
//   title.textContent = `Wallpaper #${index}`;
//   title.style.fontSize = "1.4rem";
//   title.style.fontWeight = "bold";
//
//   const resolution = document.createElement("div");
//   resolution.className = "wallpaper-resolution";
//
//   container.appendChild(title);
//   container.appendChild(resolution);
//   container.appendChild(img);
//
//   return container;
// }
//
// function renderGallery() {
//   const gallery = document.getElementById("wallpaper-gallery");
//   gallery.innerHTML = "";
//
//   const start = (currentPage - 1) * itemsPerPage;
//   const end = Math.min(start + itemsPerPage, images.length);
//
//   Promise.all(
//     images.slice(start, end).map((file, i) => createWallpaperElement(file, start + i + 1))
//   ).then((elements) => {
//     elements.forEach((element) => gallery.appendChild(element));
//   });
//
//   renderPagination();
// }
//
// function renderPagination() {
//   const totalPages = Math.ceil(images.length / itemsPerPage);
//   const pagination = document.getElementById("pagination");
//   pagination.innerHTML = "";
//
//   const prev = document.createElement("button");
//   prev.textContent = "上一页";
//   prev.disabled = currentPage === 1;
//   prev.onclick = () => {
//     currentPage--;
//     renderGallery();
//   };
//   pagination.appendChild(prev);
//
//   for (let i = 1; i <= totalPages; i++) {
//     const btn = document.createElement("button");
//     btn.textContent = i;
//     if (i === currentPage) btn.classList.add("active");
//     btn.onclick = () => {
//       currentPage = i;
//       renderGallery();
//     };
//     pagination.appendChild(btn);
//   }
//
//   const next = document.createElement("button");
//   next.textContent = "下一页";
//   next.disabled = currentPage === totalPages;
//   next.onclick = () => {
//     currentPage++;
//     renderGallery();
//   };
//   pagination.appendChild(next);
// }
//
// fetch("/assets/images/4kgbc-wallpapers.json")
//   .then((response) => response.json())
//   .then((data) => {
//     images = data;
//     renderGallery();
//   })
//   .catch((err) => {
//     console.error("无法加载图片列表:", err);
//   });