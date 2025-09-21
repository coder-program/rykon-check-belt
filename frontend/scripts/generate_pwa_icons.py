from PIL import Image
import os

def create_pwa_icons(input_image_path, output_dir):
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    
    # Criar diretório de saída se não existir
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Abrir imagem original
    with Image.open(input_image_path) as img:
        # Converter para RGBA para garantir transparência
        img = img.convert('RGBA')
        
        # Gerar cada tamanho de ícone
        for size in sizes:
            resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
            output_path = os.path.join(output_dir, f'icon-{size}x{size}.png')
            resized_img.save(output_path, 'PNG')
            print(f'Generated: {output_path}')