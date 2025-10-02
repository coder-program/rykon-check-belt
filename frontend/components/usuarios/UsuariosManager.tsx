"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsuarios,
  getPerfis,
  getPermissoes,
  updateUsuario,
  deleteUsuario,
  createPerfil,
  updatePerfil,
  deletePerfil,
  type Usuario,
  type Perfil,
  type Permissao,
  type UpdateUsuarioDto,
  type CreatePerfilDto,
  type UpdatePerfilDto,
} from "@/lib/usuariosApi";

const UsuariosManager = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("usuarios");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"user" | "profile" | "">("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Queries
  const {
    data: usuarios,
    isLoading: loadingUsuarios,
    error: errorUsuarios,
  } = useQuery({
    queryKey: ["usuarios"],
    queryFn: getUsuarios,
  });

  const {
    data: perfis,
    isLoading: loadingPerfis,
    error: errorPerfis,
  } = useQuery({
    queryKey: ["perfis"],
    queryFn: getPerfis,
  });

  const {
    data: permissoes,
    isLoading: loadingPermissoes,
    error: errorPermissoes,
  } = useQuery({
    queryKey: ["permissoes"],
    queryFn: getPermissoes,
  });

  // Mutations
  const updateUsuarioMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUsuarioDto }) =>
      updateUsuario(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setModalOpen(false);
      setFormData({});
      setEditingItem(null);
    },
  });

  const deleteUsuarioMutation = useMutation({
    mutationFn: deleteUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });

  const createPerfilMutation = useMutation({
    mutationFn: createPerfil,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis"] });
      setModalOpen(false);
      setFormData({});
      setEditingItem(null);
    },
  });

  const updatePerfilMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePerfilDto }) =>
      updatePerfil(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis"] });
      setModalOpen(false);
      setFormData({});
      setEditingItem(null);
    },
  });

  const deletePerfilMutation = useMutation({
    mutationFn: deletePerfil,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis"] });
    },
  });

  const loading = loadingUsuarios || loadingPerfis || loadingPermissoes;

  // Removido handleCreateUser - usar tela de cadastro no login

  const handleEditUser = (user: any) => {
    setModalType("user");
    setEditingItem(user);
    setFormData({
      ...user,
      password: "",
      perfil_ids: user.perfis?.map((p: any) => p.id) || [],
    });
    setModalOpen(true);
  };

  const handleCreateProfile = () => {
    setModalType("profile");
    setEditingItem(null);
    setFormData({
      nome: "",
      descricao: "",
      ativo: true,
      permissao_ids: [],
    });
    setModalOpen(true);
  };

  const handleEditProfile = (profile: any) => {
    setModalType("profile");
    setEditingItem(profile);
    setFormData({
      ...profile,
      permissao_ids: profile.permissoes?.map((p: any) => p.id) || [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (modalType === "user") {
        if (editingItem) {
          // Atualizar usuário
          await updateUsuarioMutation.mutateAsync({
            id: editingItem.id,
            data: {
              email: formData.email,
              nome: formData.nome,
              cpf: formData.cpf,
              telefone: formData.telefone,
              ativo: formData.ativo,
              perfil_ids: formData.perfil_ids,
            },
          });
        } else {
          // Criar usuário não é permitido aqui (usar tela de registro)
          alert(
            "Para criar novos usuários, use a tela de cadastro no login."
          );
          setModalOpen(false);
        }
      } else if (modalType === "profile") {
        if (editingItem) {
          // Atualizar perfil
          await updatePerfilMutation.mutateAsync({
            id: editingItem.id,
            data: {
              nome: formData.nome,
              descricao: formData.descricao,
              ativo: formData.ativo,
              permissao_ids: formData.permissao_ids,
            },
          });
        } else {
          // Criar perfil
          await createPerfilMutation.mutateAsync({
            nome: formData.nome,
            descricao: formData.descricao,
            ativo: formData.ativo,
            permissao_ids: formData.permissao_ids,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar. Verifique os dados e tente novamente.");
    }
  };

  const handleDelete = async (type: "user" | "profile", id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este item?")) {
      return;
    }

    try {
      if (type === "user") {
        await deleteUsuarioMutation.mutateAsync(id);
      } else {
        await deletePerfilMutation.mutateAsync(id);
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir. Tente novamente.");
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;

  if (errorUsuarios || errorPerfis || errorPermissoes) {
    return (
      <div className="error">
        Erro ao carregar dados. Verifique sua conexão com o backend.
      </div>
    );
  }

  return (
    <div className="usuarios-manager">
      <div className="header">
        <h1>👥 Gerenciamento de Usuários e Perfis</h1>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "usuarios" ? "active" : ""}
          onClick={() => setActiveTab("usuarios")}
        >
          Usuários ({usuarios?.length || 0})
        </button>
        <button
          className={activeTab === "perfis" ? "active" : ""}
          onClick={() => setActiveTab("perfis")}
        >
          Perfis ({perfis?.length || 0})
        </button>
        <button
          className={activeTab === "permissoes" ? "active" : ""}
          onClick={() => setActiveTab("permissoes")}
        >
          Permissões ({permissoes?.length || 0})
        </button>
      </div>

      {activeTab === "usuarios" && (
        <div className="usuarios-tab">
          <div className="tab-header">
            <h2>Usuários</h2>
            <p className="info-text">
              💡 Para criar novos usuários, use a tela de cadastro no login.
            </p>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Perfis</th>
                  <th>Status</th>
                  <th>Último Login</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios && usuarios.length > 0 ? (
                  usuarios.map((user) => (
                  <tr key={user.id}>
                    <td>{user.nome}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      {user.perfis?.map((p: any) => (
                        <span key={p.id} className="badge">
                          {p.nome}
                        </span>
                      ))}
                    </td>
                    <td>
                      <span
                        className={`status ${user.ativo ? "active" : "inactive"}`}
                      >
                        {user.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      {user.ultimo_login
                        ? new Date(user.ultimo_login).toLocaleString()
                        : "Nunca"}
                    </td>
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditUser(user)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete("user", user.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "perfis" && (
        <div className="perfis-tab">
          <div className="tab-header">
            <h2>Perfis</h2>
            <button className="btn-primary" onClick={handleCreateProfile}>
              ➕ Novo Perfil
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Permissões</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {perfis && perfis.length > 0 ? (
                  perfis.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.descricao}</td>
                    <td>
                      {p.permissoes?.map((perm: any) => (
                        <span key={perm.id} className="badge">
                          {perm.nome}
                        </span>
                      ))}
                    </td>
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditProfile(p)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete("profile", p.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center">
                      Nenhum perfil encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "permissoes" && (
        <div className="permissoes-tab">
          <div className="tab-header">
            <h2>Permissões</h2>
            <span className="permission-count">
              Total: {permissoes?.length || 0}
            </span>
          </div>

          <div className="permissions-grid">
            {permissoes && permissoes.length > 0 ? (
              permissoes.map((perm) => (
              <div key={perm.id} className="permission-module">
                <h3>{perm.nome}</h3>
                <div className="permission-list">
                  <div className="permission-item">
                    <span className="permission-name">{perm.descricao}</span>
                    <code className="permission-code">{perm.nome}</code>
                  </div>
                </div>
              </div>
              ))
            ) : (
              <p className="text-center">Nenhuma permissão encontrada</p>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalType === "user" ? "Usuário" : "Perfil"}</h2>
              <button
                className="modal-close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Inputs simples (exemplo) */}
              <div className="form-group">
                <label>Nome</label>
                <input
                  value={formData.nome || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <input
                  value={formData.descricao || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosManager;
