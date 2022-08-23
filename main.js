import 'milligram'
import $ from 'cash-dom'
import { getDocument } from "pdfjs-dist"
import jsQR from "jsqr";

(async function () {


  const pdfjs = await import('pdfjs-dist/build/pdf');
  const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');

  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  $('#button').on('click', () => $("#file").trigger('click'))

  async function fileLoaded(file) {
    if (!file) return;
    $("#imagelist").html("");

    const append = async ({canvas, code}) => {
      $("#imagelist").append(
        [
          code && `	<p><textarea id="code">${code.data}</textarea></p>`,
          `<img id="image" alt="" src="${URL.createObjectURL(await blob(canvas))}">`,

        ].filter(Boolean).join('')
      )
    }

    if (file.type.startsWith('image/')) {
      const image = await readImage(file);
      await append(await imageToCanvas(image))
      return;
    }


    const fileUrl = URL.createObjectURL(file);
    const doc = await getDocument({ url: fileUrl }).promise;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      await append(await pageToCanvas(page))
    }



  }


  async function readImage(blob) {
    return new Promise(r => {
      const url = URL.createObjectURL(blob)
      const image = new Image();
      image.onload = () => {
        r(image);
        URL.revokeObjectURL(blob);
      };
      image.src = url;
    })

  }

  async function imageToCanvas(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(data.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
    return { canvas, code };
  }

  async function pageToCanvas(page) {

    const pageViewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = pageViewport.width;
    canvas.height = pageViewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({
      canvasContext: ctx,
      viewport: pageViewport,
    }).promise


    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(data.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });

    return { canvas, code };
  }

  async function blob(canvas) {
    return new Promise(r => canvas.toBlob(r))
  }


  async function readFileAsDataUri(file) {
    return new Promise((r, e) => {
      const reader = new FileReader();
      reader.onload = () => r(reader.result)
      reader.onerror = (err) => e(err)
      reader.readAsDataURL(file);
    })
  }

  $('#file').on('change', e => fileLoaded(e.target.files[0]))


})()

