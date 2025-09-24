import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaceEmbedding } from './entities/face-embedding.entity';
import { CreateFaceEmbeddingDto, FaceCheckInDto } from './dto/face-recognition.dto';
import { getDistance } from 'geolib';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FaceRecognitionService {
  constructor(
    @InjectRepository(FaceEmbedding)
    private faceEmbeddingRepository: Repository<FaceEmbedding>,
  ) {}

  /**
   * Salva o embedding facial de um usuário
   */
  async saveFaceEmbedding(createDto: CreateFaceEmbeddingDto): Promise<FaceEmbedding> {
    // Salvar a imagem no filesystem
    const imageUrl = await this.saveImageToFileSystem(createDto.imageBase64);

    const faceEmbedding = this.faceEmbeddingRepository.create({
      ...createDto,
      imageUrl,
    });

    return this.faceEmbeddingRepository.save(faceEmbedding);
  }

  /**
   * Encontra uma pessoa pelo reconhecimento facial
   */
  async recognizeFace(faceDescriptor: number[], similarityThreshold = 0.6): Promise<FaceEmbedding | null> {
    const embeddings = await this.faceEmbeddingRepository.find({
      where: { isActive: true },
      relations: ['aluno'], // 'instrutor'],
    });

    let bestMatch: FaceEmbedding | null = null;
    let highestSimilarity = 0;

    for (const embedding of embeddings) {
      const similarity = this.calculateCosineSimilarity(faceDescriptor, embedding.faceDescriptor);
      
      if (similarity > highestSimilarity && similarity >= similarityThreshold) {
        highestSimilarity = similarity;
        bestMatch = embedding;
      }
    }

    return bestMatch;
  }

  /**
   * Realiza check-in por reconhecimento facial
   */
  async faceCheckIn(checkInDto: FaceCheckInDto, unidadeLocation: { latitude: number; longitude: number }) {
    // 1. Validar localização (raio de 50m)
    const distance = getDistance(
      { latitude: checkInDto.latitude, longitude: checkInDto.longitude },
      { latitude: unidadeLocation.latitude, longitude: unidadeLocation.longitude }
    );

    if (distance > 50) {
      throw new Error('Você está muito longe da academia. Distância atual: ' + distance + 'm');
    }

    // 2. Reconhecer rosto
    const recognizedPerson = await this.recognizeFace(checkInDto.faceDescriptor);
    
    if (!recognizedPerson) {
      throw new Error('Rosto não reconhecido ou similaridade muito baixa');
    }

    return {
      recognized: true,
      person: recognizedPerson.aluno, // || recognizedPerson.instrutor,
      similarity: this.calculateCosineSimilarity(checkInDto.faceDescriptor, recognizedPerson.faceDescriptor),
      distance: distance,
    };
  }

  /**
   * Calcula similaridade coseno entre dois vetores
   */
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vetores devem ter o mesmo tamanho');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Salva imagem base64 no filesystem
   */
  private async saveImageToFileSystem(base64Image: string): Promise<string> {
    // Remove o prefixo data:image/...;base64,
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Criar diretório se não existir
    const uploadDir = path.join(process.cwd(), 'uploads', 'faces');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Gerar nome único para o arquivo
    const filename = `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const filepath = path.join(uploadDir, filename);

    // Processar e salvar imagem com Sharp
    await sharp(buffer)
      .resize(300, 300) // Redimensionar para economizar espaço
      .jpeg({ quality: 90 })
      .toFile(filepath);

    return `/uploads/faces/${filename}`;
  }

  /**
   * Busca embedding por pessoa
   */
  async getFaceEmbeddingByPerson(alunoId?: string): Promise<FaceEmbedding[]> {
    const where: any = { isActive: true };

    if (alunoId) {
      where.alunoId = alunoId;
    }

    // if (instrutorId) {
    //   where.instrutorId = instrutorId;
    // }
    
    return this.faceEmbeddingRepository.find({ where });
  }

  /**
   * Remove embedding facial
   */
  async removeFaceEmbedding(id: string): Promise<void> {
    await this.faceEmbeddingRepository.update(id, { isActive: false });
  }
}