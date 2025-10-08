import { useAuth } from "@/app/auth/AuthContext";

export const usePermissions = () => {
  const { user } = useAuth();

  /**
   * Verifica se o usuário tem um perfil específico
   * @param perfil Nome do perfil (case-insensitive)
   * @returns boolean
   */
  const hasPerfil = (perfil: string): boolean => {
    if (!user?.perfis || !Array.isArray(user.perfis)) return false;

    return user.perfis
      .map((p: string | { nome?: string; name?: string }) => {
        if (typeof p === "string") return p.toLowerCase();
        if (typeof p === "object" && p?.nome) return p.nome.toLowerCase();
        if (typeof p === "object" && p?.name) return p.name.toLowerCase();
        return String(p).toLowerCase();
      })
      .includes(perfil.toLowerCase());
  };

  /**
   * Verifica se o usuário tem algum dos perfis listados
   * @param perfis Array de nomes de perfis
   * @returns boolean
   */
  const hasAnyPerfil = (perfis: string[]): boolean => {
    return perfis.some((perfil) => hasPerfil(perfil));
  };

  /**
   * Verifica se o usuário tem todos os perfis listados
   * @param perfis Array de nomes de perfis
   * @returns boolean
   */
  const hasAllPerfis = (perfis: string[]): boolean => {
    return perfis.every((perfil) => hasPerfil(perfil));
  };

  /**
   * Verifica se o usuário tem uma permissão específica
   * @param permission Código da permissão
   * @returns boolean
   */
  const hasPermission = (permission: string): boolean => {
    if (!user?.permissions || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permission);
  };

  /**
   * Verifica se o usuário tem alguma das permissões listadas
   * @param permissions Array de códigos de permissões
   * @returns boolean
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  };

  /**
   * Verifica se o usuário tem todas as permissões listadas
   * @param permissions Array de códigos de permissões
   * @returns boolean
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  /**
   * Verifica se o usuário é Master (administrador do sistema)
   * @returns boolean
   */
  const isMaster = (): boolean => {
    return hasPerfil("master");
  };

  /**
   * Verifica se o usuário é Franqueado
   * @returns boolean
   */
  const isFranqueado = (): boolean => {
    return hasPerfil("franqueado");
  };

  /**
   * Verifica se o usuário é Instrutor
   * @returns boolean
   */
  const isInstrutor = (): boolean => {
    return hasPerfil("instrutor");
  };

  /**
   * Verifica se o usuário é Aluno
   * @returns boolean
   */
  const isAluno = (): boolean => {
    return hasPerfil("aluno");
  };

  /**
   * Retorna todos os perfis do usuário
   * @returns string[]
   */
  const getUserPerfis = (): string[] => {
    if (!user?.perfis || !Array.isArray(user.perfis)) return [];

    return user.perfis.map((p: string | { nome?: string; name?: string }) => {
      if (typeof p === "string") return p;
      if (typeof p === "object" && p?.nome) return p.nome;
      if (typeof p === "object" && p?.name) return p.name;
      return String(p);
    });
  };

  /**
   * Retorna todas as permissões do usuário
   * @returns string[]
   */
  const getUserPermissions = (): string[] => {
    if (!user?.permissions || !Array.isArray(user.permissions)) return [];
    return user.permissions;
  };

  return {
    hasPerfil,
    hasAnyPerfil,
    hasAllPerfis,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isMaster,
    isFranqueado,
    isInstrutor,
    isAluno,
    getUserPerfis,
    getUserPermissions,
  };
};
