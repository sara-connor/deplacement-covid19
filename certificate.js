const { PDFDocument, StandardFonts } = PDFLib

const $ = (...args) => document.querySelector(...args)
const signaturePad = new SignaturePad($('#field-signature'), { minWidth: 1, maxWidth: 3 })

function hasProfile() {
  return localStorage.getItem('name') !== null
}

function saveProfile() {
  const fieldNames = ['name', 'birthday', 'address', 'town', 'zipcode']

  fieldNames.forEach(name => {
    localStorage.setItem(name, $(`#field-${name}`).value)
  })

  localStorage.setItem('signature', signaturePad.toDataURL())
}

function getProfile() {
  const fieldNames = ['name', 'birthday', 'address', 'town', 'zipcode', 'signature']

  return fieldNames.reduce((fields, name) => {
    fields[name] = localStorage.getItem(name)
    return fields
  }, {})
}

async function generatePdf(profile, reason) {
  const url = 'certificate.pdf'
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const page = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (text, x, y, size = 11) => {
    page.drawText(text, {x, y, size, font})
  }

  drawText(profile.name, 135, 622)
  drawText(profile.birthday, 135, 593)
  drawText(profile.address, 135, 559)
  drawText(`${profile.zipcode} ${profile.town}`, 135, 544)

  switch (reason) {
    case 'work':
      drawText('x', 51, 425, 17)
      break
    case 'groceries':
      drawText('x', 51, 350, 17)
      break
    case 'health':
      drawText('x', 51, 305, 17)
      break
    case 'family':
      drawText('x', 51, 274, 17)
      break
    case 'sport':
      drawText('x', 51, 229, 17)
      break
  }

  drawText(profile.town, 375, 140)
  drawText(String((new Date).getDate()), 478, 140)
  drawText(String((new Date).getMonth() + 1).padStart(2, '0'), 502, 140)

  const signatureArrayBuffer = await fetch(profile.signature).then(res => res.arrayBuffer())
  const signatureImage = await pdfDoc.embedPng(signatureArrayBuffer)
  const signatureDimensions = signatureImage.scale(1 / (signatureImage.width / 100))

  page.drawImage(signatureImage, {
    x: page.getWidth() - signatureDimensions.width - 75,
    y: 30,
    width: signatureDimensions.width,
    height: signatureDimensions.height,
  })

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes], {type: 'application/pdf'})
  const blobUrl = URL.createObjectURL(blob)
  location.assign(blobUrl)
}

if (hasProfile()) {
  $('#form-generate').style.display = 'block'
} else {
  $('#form-profile').style.display = 'block'
}

$('#form-profile').addEventListener('submit', event => {
  event.preventDefault()
  saveProfile()
  location.reload()
})

const formWidth = $('#form-profile').offsetWidth
$('#field-signature').width = formWidth
$('#field-signature').height = formWidth / 1.5

$('#reset-signature').addEventListener('click', () => signaturePad.clear())

$('#form-generate').addEventListener('submit', event => {
  event.preventDefault()
  generatePdf(getProfile(), $('input[name="field-reason"]:checked').value)
})