"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Heart, MessageCircle, Share2, Send, Camera, Image, Video, 
  MapPin, Users, Trophy, Medal, Star, TrendingUp, Hash,
  MoreVertical, Bookmark, Flag, UserPlus, X, Upload,
  Smile, Gift, Sparkles, Flame, Target, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Post {
  id: string;
  autor: {
    id: string;
    nome: string;
    foto?: string;
    faixa: string;
    unidade: string;
    verificado?: boolean;
  };
  conteudo: string;
  imagens?: string[];
  video?: string;
  tipo: 'texto' | 'foto' | 'video' | 'conquista' | 'treino' | 'evento';
  conquista?: {
    tipo: 'graduacao' | 'campeonato' | 'grau' | 'streak';
    titulo: string;
    descricao: string;
  };
  hashtags: string[];
  localizacao?: string;
  dataPublicacao: string;
  curtidas: number;
  comentarios: Comment[];
  curtidoPorMim: boolean;
  salvo: boolean;
}

interface Comment {
  id: string;
  autorId: string;
  autorNome: string;
  autorFoto?: string;
  texto: string;
  data: string;
  curtidas: number;
}

interface Story {
  id: string;
  autorId: string;
  autorNome: string;
  autorFoto?: string;
  conteudo: string;
  imagem?: string;
  video?: string;
  visualizacoes: number;
  dataPublicacao: string;
  expirado: boolean;
}

// Mock de posts
const mockPosts: Post[] = [
  {
    id: '1',
    autor: {
      id: '1',
      nome: 'Carlos Cruz',
      faixa: 'Preta',
      unidade: 'Matriz - Centro',
      verificado: true
    },
    conteudo: '🔥 Treino pesado hoje! Trabalhamos muito a guarda e finalizações. Parabéns a todos os guerreiros que não desistiram! #TeamCruz #JiuJitsu #OSS',
    imagens: ['treino1.jpg', 'treino2.jpg'],
    tipo: 'treino',
    hashtags: ['TeamCruz', 'JiuJitsu', 'OSS'],
    localizacao: 'TeamCruz - Unidade Centro',
    dataPublicacao: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    curtidas: 145,
    comentarios: [
      {
        id: '1',
        autorId: '2',
        autorNome: 'João Silva',
        texto: 'Foi top demais, Mestre! 🥋',
        data: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        curtidas: 5
      }
    ],
    curtidoPorMim: true,
    salvo: false
  },
  {
    id: '2',
    autor: {
      id: '3',
      nome: 'Maria Santos',
      faixa: 'Roxa',
      unidade: 'Filial - Zona Norte'
    },
    conteudo: '🎉 CONSEGUI! Depois de 2 anos de dedicação, finalmente recebi minha faixa roxa! Obrigada a todos que fizeram parte dessa jornada! 💜',
    tipo: 'conquista',
    conquista: {
      tipo: 'graduacao',
      titulo: 'Nova Graduação',
      descricao: 'Promovida para Faixa Roxa'
    },
    imagens: ['graduacao.jpg'],
    hashtags: ['FaixaRoxa', 'Graduacao', 'TeamCruz', 'Conquista'],
    dataPublicacao: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    curtidas: 287,
    comentarios: [
      {
        id: '2',
        autorId: '1',
        autorNome: 'Carlos Cruz',
        texto: 'Merecido! Continue com essa dedicação! 👏',
        data: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        curtidas: 15
      },
      {
        id: '3',
        autorId: '4',
        autorNome: 'Pedro Costa',
        texto: 'Parabéns, guerreira! 🔥',
        data: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        curtidas: 8
      }
    ],
    curtidoPorMim: false,
    salvo: true
  },
  {
    id: '3',
    autor: {
      id: '5',
      nome: 'Lucas Oliveira',
      faixa: 'Azul',
      unidade: 'Filial - Zona Sul'
    },
    conteudo: '💪 45 dias consecutivos de treino! Rumo aos 100! Disciplina é liberdade! #StreakDeTreino #NeverGiveUp',
    tipo: 'conquista',
    conquista: {
      tipo: 'streak',
      titulo: 'Sequência de Treinos',
      descricao: '45 dias consecutivos'
    },
    hashtags: ['StreakDeTreino', 'NeverGiveUp', 'Disciplina'],
    dataPublicacao: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    curtidas: 89,
    comentarios: [],
    curtidoPorMim: false,
    salvo: false
  }
];

// Mock de stories
const mockStories: Story[] = [
  {
    id: '1',
    autorId: '1',
    autorNome: 'Carlos Cruz',
    autorFoto: undefined,
    conteudo: 'Bom dia, guerreiros! Hoje tem treino especial às 19h!',
    imagem: 'story1.jpg',
    visualizacoes: 156,
    dataPublicacao: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expirado: false
  },
  {
    id: '2',
    autorId: '3',
    autorNome: 'Maria Santos',
    autorFoto: undefined,
    conteudo: 'Aquecimento pré-treino 🔥',
    video: 'story2.mp4',
    visualizacoes: 98,
    dataPublicacao: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    expirado: false
  }
];

const hashtagsTrending = [
  { tag: 'TeamCruz', posts: 1234 },
  { tag: 'OSS', posts: 890 },
  { tag: 'JiuJitsu', posts: 756 },
  { tag: 'Graduacao', posts: 234 },
  { tag: 'Campeonato', posts: 189 }
];

const unidades = [
  'Todas as Unidades',
  'Matriz - Centro',
  'Filial - Zona Norte',
  'Filial - Zona Sul',
  'Filial - Zona Oeste'
];

export default function RedeSocialTeam() {
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [stories, setStories] = useState<Story[]>(mockStories);
  const [showNewPost, setShowNewPost] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('Todas as Unidades');
  const [tipoFeed, setTipoFeed] = useState<'todos' | 'unidade' | 'seguindo'>('todos');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado do novo post
  const [novoPost, setNovoPost] = useState({
    conteudo: '',
    tipo: 'texto' as Post['tipo'],
    imagens: [] as string[],
    hashtags: [] as string[],
    localizacao: ''
  });

  // Estado do comentário
  const [comentarios, setComentarios] = useState<{ [key: string]: string }>({});

  const handleCurtir = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          curtidoPorMim: !post.curtidoPorMim,
          curtidas: post.curtidoPorMim ? post.curtidas - 1 : post.curtidas + 1
        };
      }
      return post;
    }));
    
    const post = posts.find(p => p.id === postId);
    if (post && !post.curtidoPorMim) {
      toast('❤️ Curtido!', { duration: 1000 });
    }
  };

  const handleSalvar = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, salvo: !post.salvo };
      }
      return post;
    }));
    
    const post = posts.find(p => p.id === postId);
    toast(post?.salvo ? '📌 Removido dos salvos' : '📌 Salvo!', { duration: 1500 });
  };

  const handleComentar = (postId: string) => {
    const comentario = comentarios[postId];
    if (!comentario?.trim()) return;

    const novoComentario: Comment = {
      id: Date.now().toString(),
      autorId: 'current-user',
      autorNome: 'Você',
      texto: comentario,
      data: new Date().toISOString(),
      curtidas: 0
    };

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comentarios: [...post.comentarios, novoComentario]
        };
      }
      return post;
    }));

    setComentarios(prev => ({ ...prev, [postId]: '' }));
    toast.success('Comentário publicado!', { duration: 1500 });
  };

  const handlePublicarPost = () => {
    if (!novoPost.conteudo.trim()) {
      toast.error('Escreva algo para publicar!');
      return;
    }

    const post: Post = {
      id: Date.now().toString(),
      autor: {
        id: 'current-user',
        nome: 'Você',
        faixa: 'Azul',
        unidade: 'Matriz - Centro'
      },
      conteudo: novoPost.conteudo,
      tipo: novoPost.tipo,
      hashtags: novoPost.hashtags,
      localizacao: novoPost.localizacao,
      dataPublicacao: new Date().toISOString(),
      curtidas: 0,
      comentarios: [],
      curtidoPorMim: false,
      salvo: false,
      imagens: novoPost.imagens
    };

    setPosts([post, ...posts]);
    setNovoPost({
      conteudo: '',
      tipo: 'texto',
      imagens: [],
      hashtags: [],
      localizacao: ''
    });
    setShowNewPost(false);
    
    toast.success('Post publicado com sucesso! 🎉', {
      duration: 3000,
      position: 'top-center'
    });
  };

  const extractHashtags = (text: string) => {
    const regex = /#\w+/g;
    const tags = text.match(regex) || [];
    return tags.map(tag => tag.substring(1));
  };

  const getBeltEmoji = (faixa: string) => {
    const emojis: Record<string, string> = {
      'Branca': '⚪',
      'Azul': '🔵',
      'Roxa': '🟣',
      'Marrom': '🟤',
      'Preta': '⚫',
      'Coral': '🔴'
    };
    return emojis[faixa] || '⚪';
  };

  const getConquistaIcon = (tipo: string) => {
    switch(tipo) {
      case 'graduacao': return <Medal className="h-5 w-5 text-purple-600" />;
      case 'campeonato': return <Trophy className="h-5 w-5 text-yellow-600" />;
      case 'grau': return <Star className="h-5 w-5 text-red-600" />;
      case 'streak': return <Flame className="h-5 w-5 text-orange-600" />;
      default: return <Award className="h-5 w-5 text-blue-600" />;
    }
  };

  const postsFiltrados = posts.filter(post => {
    if (unidadeSelecionada === 'Todas as Unidades') return true;
    return post.autor.unidade === unidadeSelecionada;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header com Stories */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {/* Botão de adicionar story */}
          <div className="flex-shrink-0">
            <button className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <Camera className="h-6 w-6 text-gray-600" />
              </div>
              <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1">
                <Send className="h-3 w-3 text-white" />
              </div>
            </button>
            <p className="text-xs text-center mt-1">Seu Story</p>
          </div>

          {/* Stories dos outros usuários */}
          {stories.map(story => (
            <div key={story.id} className="flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedStory(story);
                  setShowStoryViewer(true);
                }}
                className="relative w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-yellow-500 p-0.5"
              >
                <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-700">
                    {story.autorNome.charAt(0)}
                  </span>
                </div>
              </button>
              <p className="text-xs text-center mt-1 truncate w-20">{story.autorNome}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros e Novo Post */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Criar novo post */}
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  V
                </div>
                <button
                  onClick={() => setShowNewPost(true)}
                  className="flex-1 text-left px-4 py-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  No que você está pensando?
                </button>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Image className="h-5 w-5 text-green-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Video className="h-5 w-5 text-red-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtros de unidade */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <select
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              value={unidadeSelecionada}
              onChange={(e) => setUnidadeSelecionada(e.target.value)}
            >
              {unidades.map(unidade => (
                <option key={unidade} value={unidade}>{unidade}</option>
              ))}
            </select>
            
            <div className="flex gap-2">
              <button
                onClick={() => setTipoFeed('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tipoFeed === 'todos' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Para você
              </button>
              <button
                onClick={() => setTipoFeed('unidade')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tipoFeed === 'unidade' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sua Unidade
              </button>
              <button
                onClick={() => setTipoFeed('seguindo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tipoFeed === 'seguindo' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Seguindo
              </button>
            </div>
          </div>

          {/* Feed de Posts */}
          <div className="space-y-4">
            {postsFiltrados.map(post => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200"
              >
                {/* Header do Post */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                          {post.autor.nome.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-sm">
                          {getBeltEmoji(post.autor.faixa)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{post.autor.nome}</h3>
                          {post.autor.verificado && (
                            <div className="bg-blue-600 rounded-full p-0.5">
                              <Star className="h-3 w-3 text-white fill-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{post.autor.unidade}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(post.dataPublicacao), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}</span>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Conquista Badge */}
                  {post.conquista && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2">
                        {getConquistaIcon(post.conquista.tipo)}
                        <div>
                          <p className="font-semibold text-gray-900">{post.conquista.titulo}</p>
                          <p className="text-sm text-gray-600">{post.conquista.descricao}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conteúdo do Post */}
                  <p className="mt-3 text-gray-800 whitespace-pre-wrap">{post.conteudo}</p>

                  {/* Localização */}
                  {post.localizacao && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>{post.localizacao}</span>
                    </div>
                  )}
                </div>

                {/* Imagens do Post */}
                {post.imagens && post.imagens.length > 0 && (
                  <div className={`grid ${post.imagens.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1`}>
                    {post.imagens.map((img, idx) => (
                      <div key={idx} className="bg-gray-200 aspect-square flex items-center justify-center">
                        <Image className="h-12 w-12 text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats do Post */}
                <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      ❤️ {post.curtidas}
                    </span>
                    <span>{post.comentarios.length} comentários</span>
                  </div>
                </div>

                {/* Ações do Post */}
                <div className="border-t border-gray-100 px-4 py-2">
                  <div className="flex items-center justify-around">
                    <button
                      onClick={() => handleCurtir(post.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        post.curtidoPorMim 
                          ? 'text-red-600 bg-red-50' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Heart className={`h-5 w-5 ${post.curtidoPorMim ? 'fill-current' : ''}`} />
                      <span className="text-sm font-medium">Curtir</span>
                    </button>
                    
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Comentar</span>
                    </button>
                    
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Share2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Compartilhar</span>
                    </button>
                    
                    <button
                      onClick={() => handleSalvar(post.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        post.salvo 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Bookmark className={`h-5 w-5 ${post.salvo ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Comentários */}
                {post.comentarios.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                    {post.comentarios.map(comentario => (
                      <div key={comentario.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                          {comentario.autorNome.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <p className="text-sm font-semibold text-gray-900">{comentario.autorNome}</p>
                            <p className="text-sm text-gray-700">{comentario.texto}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <button className="hover:underline">Curtir</button>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(comentario.data), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Campo de Comentário */}
                <div className="border-t border-gray-100 p-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      V
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Escreva um comentário..."
                        className="flex-1 px-3 py-2 bg-gray-100 rounded-full text-sm"
                        value={comentarios[post.id] || ''}
                        onChange={(e) => setComentarios(prev => ({ 
                          ...prev, 
                          [post.id]: e.target.value 
                        }))}
                        onKeyPress={(e) => e.key === 'Enter' && handleComentar(post.id)}
                      />
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Smile className="h-5 w-5 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Gift className="h-5 w-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Coluna Lateral - Trending e Sugestões */}
        <div className="space-y-4">
          {/* Trending Hashtags */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Em Alta na TeamCruz
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hashtagsTrending.map((hashtag, idx) => (
                <button
                  key={idx}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">#{hashtag.tag}</p>
                      <p className="text-xs text-gray-500">{hashtag.posts} publicações</p>
                    </div>
                    <Hash className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Ranking Semanal */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Top da Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { nome: 'João Silva', treinos: 7, posicao: 1 },
                { nome: 'Maria Santos', treinos: 6, posicao: 2 },
                { nome: 'Pedro Costa', treinos: 5, posicao: 3 }
              ].map(aluno => (
                <div key={aluno.posicao} className="flex items-center gap-3 p-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    aluno.posicao === 1 ? 'bg-yellow-400 text-yellow-900' :
                    aluno.posicao === 2 ? 'bg-gray-400 text-white' :
                    'bg-orange-400 text-orange-900'
                  }`}>
                    {aluno.posicao}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{aluno.nome}</p>
                    <p className="text-xs text-gray-500">{aluno.treinos} treinos</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sugestões de Amizade */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-purple-600" />
                Pessoas que você pode conhecer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { nome: 'Ana Clara', faixa: 'Azul', unidade: 'Matriz' },
                { nome: 'Roberto Lima', faixa: 'Roxa', unidade: 'Zona Norte' },
                { nome: 'Fernanda Costa', faixa: 'Marrom', unidade: 'Zona Sul' }
              ].map((pessoa, idx) => (
                <div key={idx} className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
                      {pessoa.nome.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{pessoa.nome}</p>
                      <p className="text-xs text-gray-500">{pessoa.faixa} • {pessoa.unidade}</p>
                    </div>
                  </div>
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Novo Post */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-xl"
            >
              {/* Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Criar Publicação</h2>
                  <button
                    onClick={() => setShowNewPost(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    V
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Você</p>
                    <select className="text-xs bg-gray-100 rounded px-2 py-1 mt-1">
                      <option>🌐 Público</option>
                      <option>👥 Apenas amigos</option>
                      <option>🔒 Privado</option>
                    </select>
                  </div>
                </div>

                <textarea
                  className="w-full p-3 text-lg resize-none outline-none"
                  placeholder="No que você está pensando?"
                  rows={5}
                  value={novoPost.conteudo}
                  onChange={(e) => {
                    setNovoPost(prev => ({
                      ...prev,
                      conteudo: e.target.value,
                      hashtags: extractHashtags(e.target.value)
                    }));
                  }}
                />

                {/* Preview de hashtags */}
                {novoPost.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {novoPost.hashtags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Opções adicionais */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Adicionar à publicação</span>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Image className="h-5 w-5 text-green-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Video className="h-5 w-5 text-red-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Users className="h-5 w-5 text-purple-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={handlePublicarPost}
                  className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Publicar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Story Viewer */}
      <AnimatePresence>
        {showStoryViewer && selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <button
              onClick={() => setShowStoryViewer(false)}
              className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            <div className="max-w-md w-full">
              <div className="bg-gray-800 rounded-lg aspect-[9/16] flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <h3 className="text-xl font-bold mb-2">{selectedStory.autorNome}</h3>
                  <p className="text-lg">{selectedStory.conteudo}</p>
                  <p className="text-sm mt-4 opacity-70">
                    👁️ {selectedStory.visualizacoes} visualizações
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
