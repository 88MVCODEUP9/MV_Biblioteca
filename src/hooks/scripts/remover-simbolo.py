import os

pasta = os.getcwd()  # ou coloque o caminho absoluto: r'C:\MinhaPasta'

for nome_original in os.listdir(pasta):
    caminho_original = os.path.join(pasta, nome_original)
    
    # Pula se for uma subpasta (opcional – remova o if se quiser renomear pastas também)
    if os.path.isdir(caminho_original):
        continue
    
    # Remove o caractere '#' do nome
    novo_nome = nome_original.replace('#', '')
    
    # Só renomeia se o nome mudou
    if novo_nome != nome_original:
        caminho_novo = os.path.join(pasta, novo_nome)
        
        # Evita sobrescrever um arquivo já existente
        if os.path.exists(caminho_novo):
            print(f'Aviso: "{caminho_novo}" já existe – pulando "{nome_original}"')
        else:
            os.rename(caminho_original, caminho_novo)
            print(f'Renomeado: "{nome_original}" → "{novo_nome}"')

print('Pronto!')