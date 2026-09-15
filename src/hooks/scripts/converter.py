
import fitz
from pathlib import Path

# Pasta onde o script está
PASTA = Path(__file__).parent

# Procura PDFs na mesma pasta do script
pdfs = list(PASTA.glob("*.pdf"))

print("=" * 60)
print("CONVERSOR PDF -> PNG")
print("=" * 60)
print()

if not pdfs:
    print("NENHUM PDF ENCONTRADO!")
    print()
    print("Coloque um arquivo PDF na pasta:")
    print(PASTA)
    input("\nPressione ENTER para sair...")
    raise SystemExit

# Pasta de saída
saida = PASTA / "PNG"
saida.mkdir(exist_ok=True)

print(f"PDFs encontrados: {len(pdfs)}")
print()

for i, pdf in enumerate(pdfs, 1):

    print(f"[{i}/{len(pdfs)}] Convertendo: {pdf.name}")

    try:
        documento = fitz.open(pdf)

        if documento.page_count == 0:
            print("   ERRO: PDF sem páginas.")
            documento.close()
            continue

        # Primeira página
        pagina = documento[0]

        # Qualidade da imagem
        matriz = fitz.Matrix(3, 3)

        pix = pagina.get_pixmap(
            matrix=matriz,
            alpha=False
        )

        # Mantém o mesmo nome do PDF
        arquivo_png = saida / f"{pdf.stem}.png"

        pix.save(str(arquivo_png))

        documento.close()

        print(f"   OK -> {arquivo_png.name}")

    except Exception as erro:
        print(f"   ERRO -> {erro}")

print()
print("=" * 60)
print("CONCLUÍDO!")
print("=" * 60)
print()
print(f"As imagens estão em:")
print(saida)
print()

input("Pressione ENTER para sair...")