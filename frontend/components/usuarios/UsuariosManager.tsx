"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SimpleModal from "@/components/ui/SimpleModal";
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
          alert("Para criar novos usuários, use a tela de cadastro no login.");
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
            <button
              className="btn-primary"
              onClick={() => {
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
                  perfil_ids: [],
                });
                setModalOpen(true);
              }}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ➕ Novo Usuário
            </button>
          </div>

          <div className="table-container">
            <table>
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
                  {/* <th>Ações</th> */}
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
                          {user.cadastro_completo ? "✅ Sim" : " Não"}
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
            <button
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

      <SimpleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          modalType === "user" ? "✏️ Editar Usuário" : "➕ Criar Novo Perfil"
        }
      >
        <form onSubmit={handleSubmit}>
          {modalType === "user" ? (
            // Formulário de Usuário
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome || ""}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
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
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username || ""}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "2px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                    }}
                    placeholder="Ex: joao.silva"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    {editingItem ? "Nova Senha (deixe vazio para manter)" : "Senha *"}
                  </label>
                  <input
                    type="password"
                    required={!editingItem}
                    value={formData.password || ""}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf || ""}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
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
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone || ""}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
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

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold" }}>
                  <input
                    type="checkbox"
                    checked={formData.ativo !== false}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    style={{ transform: "scale(1.3)" }}
                  />
                  Usuário Ativo
                </label>
              </div>

              {perfis && perfis.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Perfis do Usuário
                  </label>
                  <div style={{
                    maxHeight: '150px',
                    overflow: 'auto',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    padding: '10px'
                  }}>
                    {perfis.map((perfil) => (
                      <label key={perfil.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        padding: '5px',
                        borderRadius: '4px',
                        backgroundColor: formData.perfil_ids?.includes(perfil.id) ? '#e3f2fd' : 'transparent'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.perfil_ids?.includes(perfil.id) || false}
                          onChange={(e) => {
                            const perfilIds = formData.perfil_ids || [];
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                perfil_ids: [...perfilIds, perfil.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                perfil_ids: perfilIds.filter((id: string) => id !== perfil.id)
                              });
                            }
                          }}
                          style={{ transform: "scale(1.3)" }}
                        />
                        <div>
                          <strong>{perfil.nome}</strong>
                          {perfil.descricao && <div style={{ fontSize: '12px', color: '#666' }}>{perfil.descricao}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Formulário de Perfil
            <>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome || ""}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
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
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  Descrição
                </label>
              </div>

              {permissoes && permissoes.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Permissões do Perfil
                  </label>
                  <div style={{
                    maxHeight: '200px',
                    overflow: 'auto',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    padding: '10px'
                  }}>
                    {permissoes.map((perm) => (
                      <label key={perm.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        padding: '5px',
                        borderRadius: '4px',
                        backgroundColor: formData.permissao_ids?.includes(perm.id) ? '#e8f5e8' : 'transparent'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.permissao_ids?.includes(perm.id) || false}
                          onChange={(e) => {
                            const permissaoIds = formData.permissao_ids || [];
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                permissao_ids: [...permissaoIds, perm.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                permissao_ids: permissaoIds.filter((id: string) => id !== perm.id)
                              });
                            }
                          }}
                          style={{ transform: "scale(1.3)" }}
                        />
                        <div>
                          <strong>{perm.nome}</strong> - {perm.modulo}
                          {perm.descricao && <div style={{ fontSize: '12px', color: '#666' }}>{perm.descricao}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Descrição
            </label>
            <textarea
              value={formData.descricao}
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

          {modalType === "profile" && permissoes && (
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  fontWeight: "bold",
                }}
              >
                Permissões
              </label>
              <div
                style={{
                  maxHeight: "200px",
                  overflow: "auto",
                  border: "2px solid #ddd",
                  borderRadius: "6px",
                  padding: "15px",
                  backgroundColor: "#f8f9fa",
                }}
              >
                {permissoes.map((perm) => (
                  <label
                    key={perm.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "10px",
                      cursor: "pointer",
                      padding: "8px",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      border: "1px solid #e9ecef",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        formData.permissao_ids?.includes(perm.id) || false
                      }
                      onChange={(e) => {
                        const permissaoIds = formData.permissao_ids || [];
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
                      style={{ marginRight: "10px", transform: "scale(1.3)" }}
                    />
                    <span style={{ fontSize: "14px", flex: 1 }}>
                      <strong>{perm.nome}</strong> - {perm.modulo}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "15px",
              paddingTop: "20px",
              borderTop: "2px solid #e9ecef",
            }}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              style={{
                padding: "12px 24px",
                border: "2px solid #6c757d",
                background: "white",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              💾 Salvar Perfil
            </button>
          </div>
        </form>
      </SimpleModal>
    </div>
  );
};

export default UsuariosManager;
