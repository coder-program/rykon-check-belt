import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FaceRecognitionService } from './face-recognition.service';
import { CreateFaceEmbeddingDto, FaceCheckInDto } from './dto/face-recognition.dto';

@ApiTags('Face Recognition')
@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(private readonly faceRecognitionService: FaceRecognitionService) {}

  @Post('cadastro')
  @ApiOperation({ summary: 'Cadastrar foto facial de usuário' })
  @ApiResponse({ status: 201, description: 'Foto cadastrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async cadastrarFace(@Body() createDto: CreateFaceEmbeddingDto) {
    try {
      const result = await this.faceRecognitionService.saveFaceEmbedding(createDto);
      return {
        success: true,
        message: 'Foto facial cadastrada com sucesso',
        data: {
          id: result.id,
          confidence: result.confidence,
          imageUrl: result.imageUrl,
        },
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Erro ao cadastrar foto facial',
        error: error.message,
      });
    }
  }

  @Get('embeddings/:tipo/:id')
  @ApiOperation({ summary: 'Buscar embeddings de uma pessoa' })
  async buscarEmbeddings(@Param('tipo') tipo: string, @Param('id') id: string) {
    const embeddings = await this.faceRecognitionService.getFaceEmbeddingByPerson(
      tipo === 'aluno' ? id : undefined,
      // tipo === 'professor' ? id : undefined,
    );

    return {
      success: true,
      data: embeddings,
    };
  }

  @Delete('embeddings/:id')
  @ApiOperation({ summary: 'Remover embedding facial' })
  async removerEmbedding(@Param('id') id: string) {
    await this.faceRecognitionService.removeFaceEmbedding(id);
    return {
      success: true,
      message: 'Embedding removido com sucesso',
    };
  }
}

@ApiTags('TeamCruz - Presenças')
@Controller('teamcruz/presencas')
export class PresencasFaceController {
  constructor(private readonly faceRecognitionService: FaceRecognitionService) {}

  @Post('checkin/face')
  @ApiOperation({ summary: 'Check-in por reconhecimento facial' })
  @ApiResponse({ status: 200, description: 'Check-in realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Rosto não reconhecido ou fora da área' })
  async checkInFacial(@Body() checkInDto: FaceCheckInDto) {
    try {
      // Localização fictícia da academia (você deve buscar isso da unidade)
      const unidadeLocation = {
        latitude: -23.5505, // São Paulo - exemplo
        longitude: -46.6333,
      };

      const result = await this.faceRecognitionService.faceCheckIn(checkInDto, unidadeLocation);

      return {
        success: true,
        message: 'Check-in realizado com sucesso!',
        data: {
          nome: result.person?.nome || 'Nome não disponível',
          similarity: Math.round(result.similarity * 100),
          distance: result.distance,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: error.message || 'Erro no check-in facial',
      });
    }
  }
}