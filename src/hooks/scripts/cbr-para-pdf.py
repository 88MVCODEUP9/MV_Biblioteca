import os
import sys
import tempfile
import patoolib
from PIL import Image

def convert_cbr_to_pdf(cbr_file):
    # Define o nome do arquivo final
    pdf_file = os.path.splitext(cbr_file)[0] + ".pdf"
    print(f"\nProcessando: '{cbr_file}' para '{pdf_file}'...")
    
    # Cria uma pasta temporária para extrair as imagens
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Extrai o arquivo .cbr
            patoolib.extract_archive(cbr_file, outdir=temp_dir, interactive=False)
        except Exception as e:
            print(f"Erro ao extrair {cbr_file}. Certifique-se de ter o WinRAR ou 7-Zip instalado.")
            return

        # Procura por todas as imagens dentro da pasta extraída
        images = []
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    images.append(os.path.join(root, file))
        
        # Ordena as imagens em ordem alfabética (ordem das páginas)
        images.sort()
        
        if not images:
            print("Nenhuma imagem suportada foi encontrada dentro do arquivo.")
            return
        
        # Converte as imagens para PDF
        try:
            print(f"Juntando {len(images)} páginas no PDF...")
            img_list = [Image.open(img).convert("RGB") for img in images]
            
            # Salva o PDF usando a primeira imagem como base e anexando o resto
            img_list[0].save(pdf_file, save_all=True, append_images=img_list[1:])
            print("Conversão concluída com sucesso! 🚀")
        except Exception as e:
            print(f"Erro ao criar o arquivo PDF: {e}")

if __name__ == "__main__":
    # Se você arrastar arquivos para o script ou passar o nome no terminal
    if len(sys.argv) > 1:
        for file in sys.argv[1:]:
            if file.lower().endswith('.cbr'):
                convert_cbr_to_pdf(file)
            else:
                print(f"Ignorado (não é um .cbr): {file}")
    else:
        # Se você apenas rodar o script sozinho, ele converte todos os .cbr da pasta atual
        cbr_files = [f for f in os.listdir('.') if f.lower().endswith('.cbr')]
        if not cbr_files:
            print("Nenhum arquivo .cbr encontrado nesta pasta.")
            print("Uso: python cbr2pdf.py <seu_quadrinho.cbr>")
        else:
            for file in cbr_files:
                convert_cbr_to_pdf(file)
