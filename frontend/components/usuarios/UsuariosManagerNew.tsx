"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsuarios,
  getPerfis,
  getPermissoes,
  updateUsuario,
  deleteUsuario,
  createUsuario,
  createPerfil,
  updatePerfil,
  deletePerfil,
  type UpdateUsuarioDto,
  type UpdatePerfilDto,
} from "@/lib/usuariosApi";

const UsuariosManagerNew = () => {
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
    queryFn: () => {
      return getUsuarios();
    },
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
  const createUsuarioMutation = useMutation({
    mutationFn: (data: any) => createUsuario(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setModalOpen(false);
      setFormData({});
      setEditingItem(null);
    },
  });

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

  const handleCreateUser = () => {
    setModalType("user");
    setEditingItem(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      nome: "",
      cpf: "",
      telefone: "",
      ativo: true,
      cadastro_completo: false,
      perfil_ids: [],
    });
    setModalOpen(true);
  };

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
          const updateData: any = {
            email: formData.email,
            nome: formData.nome,
            cpf: formData.cpf,
            telefone: formData.telefone,
            ativo: formData.ativo,
            cadastro_completo: formData.cadastro_completo,
            perfil_ids: formData.perfil_ids,
          };

          // Só envia senha se foi preenchida
          if (formData.password && formData.password.trim() !== "") {
            updateData.password = formData.password;
          }

          await updateUsuarioMutation.mutateAsync({
            id: editingItem.id,
            data: updateData,
          });
        } else {
          // Criar usuário
          await createUsuarioMutation.mutateAsync({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            nome: formData.nome,
            cpf: formData.cpf,
            telefone: formData.telefone,
            ativo: formData.ativo,
            cadastro_completo: formData.cadastro_completo,
            perfil_ids: formData.perfil_ids,
          });
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
            <button
              className="btn-primary"
              onClick={handleCreateUser}
              style={{
                padding: "10px 20px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ➕ Novo Usuário
            </button>
          </div>

          <div
            className="table-container"
            style={{ overflowX: "auto", width: "100%" }}
          >
            <table style={{ minWidth: "1200px", width: "100%" }}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>CPF</th>
                  <th>Telefone</th>
                  <th>Perfis</th>
                  <th>Status</th>
                  <th>Cadastro Completo</th>
                  <th>Último Login</th>
                  <th>Data Criação</th>
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
                      <td>{user.cpf || "—"}</td>
                      <td>{user.telefone || "—"}</td>
                      <td>
                        {user.perfis?.map((p: any) => (
                          <span key={p.id} className="badge">
                            {p.nome}
                          </span>
                        ))}
                      </td>
                      <td>
                        <span
                          className={`status ${
                            user.ativo ? "active" : "inactive"
                          }`}
                        >
                          {user.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status ${
                            user.cadastro_completo ? "active" : "inactive"
                          }`}
                        >
                          {user.cadastro_completo ? "✅ Sim" : "❌ Não"}
                        </span>
                      </td>
                      <td>
                        {user.ultimo_login
                          ? new Date(user.ultimo_login).toLocaleString("pt-BR")
                          : "Nunca"}
                      </td>
                      <td>
                        {new Date(user.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ minWidth: "100px" }}>
                        <button
                          className="btn-edit"
                          onClick={() => handleEditUser(user)}
                          style={{
                            padding: "5px 10px",
                            margin: "0 2px",
                            background: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete("user", user.id)}
                          style={{
                            padding: "5px 10px",
                            margin: "0 2px",
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          🗑️ Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="text-center">
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
            {/* <button
              className="btn-primary"
              onClick={handleCreateProfile}
              style={{
                padding: "10px 20px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ➕ Novo Perfil
            </button> */}
          </div>

          <div
            className="table-container"
            style={{ overflowX: "auto", width: "100%" }}
          >
            <table style={{ minWidth: "800px", width: "100%" }}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Permissões</th>
                  {/* <th>Ações</th> */}
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
                      {/* <td style={{ minWidth: "100px" }}>
                        <button
                          className="btn-edit"
                          onClick={() => handleEditProfile(p)}
                          style={{
                            padding: "5px 10px",
                            margin: "0 2px",
                            background: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete("profile", p.id)}
                          style={{
                            padding: "5px 10px",
                            margin: "0 2px",
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          🗑️ Excluir
                        </button>
                      </td> */}
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
              {permissoes?.length || 0} permissões disponíveis
            </span>
          </div>

          <div className="permissions-grid">
            {permissoes && permissoes.length > 0 ? (
              permissoes.map((perm) => (
                <div key={perm.id} className="permission-card">
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
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
              maxWidth: "700px",
              width: "95%",
              maxHeight: "85vh",
              overflow: "auto",
              border: "2px solid #007bff",
            }}
          >
            <div
              style={{
                padding: "25px",
                borderBottom: "2px solid #007bff",
                background: "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
                color: "white",
                borderRadius: "12px 12px 0 0",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {modalType === "user"
                  ? editingItem
                    ? "✏️ Editar Usuário"
                    : "➕ Criar Novo Usuário"
                  : editingItem
                  ? "✏️ Editar Perfil"
                  : "➕ Criar Novo Perfil"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
              {modalType === "user" ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontWeight: "bold",
                        }}
                      >
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nome || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, nome: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                        }}
                        placeholder="Ex: João Silva Santos"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontWeight: "bold",
                        }}
                      >
                        Usuário *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!!editingItem}
                        value={formData.username || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          backgroundColor: editingItem ? "#f5f5f5" : "white",
                        }}
                        placeholder="Ex: joao.silva"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontWeight: "bold",
                        }}
                      >
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                        }}
                        placeholder="Ex: joao@teamcruz.com"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontWeight: "bold",
                        }}
                      >
                        {editingItem
                          ? "Nova Senha (deixe vazio para manter)"
                          : "Senha *"}
                      </label>
                      <input
                        type="password"
                        required={!editingItem}
                        value={formData.password || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                        }}
                        placeholder="Digite a senha"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontWeight: "bold",
                        }}
                      >
                        CPF
                      </label>
                      <input
                        type="text"
                        value={formData.cpf || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, cpf: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                        }}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontWeight: "bold",
                        }}
                      >
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={formData.telefone || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, telefone: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "16px",
                          boxSizing: "border-box",
                        }}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.ativo !== false}
                        onChange={(e) =>
                          setFormData({ ...formData, ativo: e.target.checked })
                        }
                        style={{ transform: "scale(1.3)" }}
                      />
                      Usuário Ativo
                    </label>
                  </div>

                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.cadastro_completo !== false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cadastro_completo: e.target.checked,
                          })
                        }
                        style={{ transform: "scale(1.3)" }}
                      />
                      Cadastro Completo
                    </label>
                  </div>

                  {perfis && perfis.length > 0 && (
                    <div style={{ marginBottom: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontWeight: "bold",
                        }}
                      >
                        Perfis do Usuário
                      </label>
                      <div
                        style={{
                          maxHeight: "150px",
                          overflow: "auto",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          padding: "10px",
                        }}
                      >
                        {perfis.map((perfil) => (
                          <label
                            key={perfil.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginBottom: "8px",
                              cursor: "pointer",
                              padding: "5px",
                              borderRadius: "4px",
                              backgroundColor: formData.perfil_ids?.includes(
                                perfil.id
                              )
                                ? "#e3f2fd"
                                : "transparent",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                formData.perfil_ids?.includes(perfil.id) ||
                                false
                              }
                              onChange={(e) => {
                                const perfilIds = formData.perfil_ids || [];
                                let newPerfilIds: string[];

                                if (e.target.checked) {
                                  newPerfilIds = [...perfilIds, perfil.id];
                                } else {
                                  newPerfilIds = perfilIds.filter(
                                    (id: string) => id !== perfil.id
                                  );
                                }

                                // Verificar se algum perfil selecionado requer cadastro completo
                                const perfisQueRequeremCadastroCompleto = [
                                  "PROFESSOR",
                                  "INSTRUTOR",
                                  "GERENTE_UNIDADE",
                                  "RECEPCIONISTA",
                                ];

                                const perfisAtualizados = perfis.filter((p) =>
                                  newPerfilIds.includes(p.id)
                                );

                                const requerCadastroCompleto =
                                  perfisAtualizados.some((p) =>
                                    perfisQueRequeremCadastroCompleto.includes(
                                      p.nome?.toUpperCase() || ""
                                    )
                                  );

                                setFormData({
                                  ...formData,
                                  perfil_ids: newPerfilIds,
                                  cadastro_completo: requerCadastroCompleto
                                    ? true
                                    : formData.cadastro_completo,
                                });
                              }}
                              style={{ transform: "scale(1.3)" }}
                            />
                            <div>
                              <strong>{perfil.nome}</strong>
                              {perfil.descricao && (
                                <div
                                  style={{ fontSize: "12px", color: "#666" }}
                                >
                                  {perfil.descricao}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                      }}
                      placeholder="Ex: Supervisor Regional"
                    />
                  </div>

                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Descrição
                    </label>
                    <textarea
                      value={formData.descricao || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "16px",
                        minHeight: "80px",
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                      placeholder="Descrição do perfil..."
                    />
                  </div>

                  {permissoes && permissoes.length > 0 && (
                    <div style={{ marginBottom: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontWeight: "bold",
                        }}
                      >
                        Permissões do Perfil
                      </label>
                      <div
                        style={{
                          maxHeight: "200px",
                          overflow: "auto",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          padding: "10px",
                        }}
                      >
                        {permissoes.map((perm) => (
                          <label
                            key={perm.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginBottom: "8px",
                              cursor: "pointer",
                              padding: "5px",
                              borderRadius: "4px",
                              backgroundColor: formData.permissao_ids?.includes(
                                perm.id
                              )
                                ? "#e8f5e8"
                                : "transparent",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                formData.permissao_ids?.includes(perm.id) ||
                                false
                              }
                              onChange={(e) => {
                                const permissaoIds =
                                  formData.permissao_ids || [];
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    permissao_ids: [...permissaoIds, perm.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    permissao_ids: permissaoIds.filter(
                                      (id: string) => id !== perm.id
                                    ),
                                  });
                                }
                              }}
                              style={{ transform: "scale(1.3)" }}
                            />
                            <div>
                              <strong>{perm.nome}</strong> - {perm.modulo}
                              {perm.descricao && (
                                <div
                                  style={{ fontSize: "12px", color: "#666" }}
                                >
                                  {perm.descricao}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  paddingTop: "20px",
                  borderTop: "1px solid #ecf0f1",
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ddd",
                    background: "white",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
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

export default UsuariosManagerNew;
