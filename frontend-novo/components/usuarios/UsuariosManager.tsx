"use client";

import React, { useState, useEffect } from "react";

// CSS importado globalmente em app/globals.css

const UsuariosManager = () => {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [perfis, setPerfis] = useState<any[]>([]);
  const [permissoes, setPermissoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usuarios");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // mocks iguais ao projeto original
      const mockUsuarios = [
        {
          id: 1,
          username: "admin",
          email: "admin@gestao.gov.br",
          nome: "Administrador",
          cpf: "123.456.789-00",
          telefone: "(11) 99999-9999",
          ativo: true,
          perfis: [{ id: 1, nome: "Administrador" }],
        },
        {
          id: 2,
          username: "contador",
          email: "contador@gestao.gov.br",
          nome: "João Silva",
          cpf: "987.654.321-00",
          telefone: "(11) 88888-8888",
          ativo: true,
          perfis: [{ id: 2, nome: "Contador" }],
        },
      ];

      const mockPerfis = [
        {
          id: 1,
          nome: "Administrador",
          descricao: "Acesso total ao sistema",
          ativo: true,
          permissoes: [
            { id: 1, nome: "usuarios.visualizar" },
            { id: 2, nome: "usuarios.criar" },
            { id: 3, nome: "usuarios.editar" },
            { id: 4, nome: "usuarios.excluir" },
          ],
        },
        {
          id: 2,
          nome: "Contador",
          descricao: "Acesso ao módulo contábil",
          ativo: true,
          permissoes: [
            { id: 5, nome: "contabilidade.visualizar" },
            { id: 6, nome: "contabilidade.lancar" },
          ],
        },
      ];

      const mockPermissoes = [
        { id: 1, nome: "usuarios.visualizar", descricao: "Visualizar usuários" },
        { id: 2, nome: "usuarios.criar", descricao: "Criar usuários" },
        { id: 3, nome: "usuarios.editar", descricao: "Editar usuários" },
        { id: 4, nome: "usuarios.excluir", descricao: "Excluir usuários" },
        { id: 5, nome: "contabilidade.visualizar", descricao: "Visualizar contabilidade" },
        { id: 6, nome: "contabilidade.lancar", descricao: "Fazer lançamentos" },
      ];

      await new Promise((r) => setTimeout(r, 300));
      setUsuarios(mockUsuarios);
      setPerfis(mockPerfis);
      setPermissoes(mockPermissoes);
    } finally {
      setLoading(false);
    }
  };

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
    await new Promise((r) => setTimeout(r, 300));

    if (modalType === "user") {
      if (editingItem) {
        setUsuarios((prev) => prev.map((u) => (u.id === editingItem.id ? { ...u, ...formData } : u)));
      } else {
        const newUser = {
          id: Date.now(),
          ...formData,
          perfis: formData.perfil_ids?.map((id: number) => perfis.find((p: any) => p.id === id)) || [],
        };
        setUsuarios((prev) => [...prev, newUser]);
      }
    } else {
      if (editingItem) {
        setPerfis((prev) => prev.map((p) => (p.id === editingItem.id ? { ...p, ...formData } : p)));
      } else {
        const newProfile = {
          id: Date.now(),
          ...formData,
          permissoes: formData.permissao_ids?.map((id: number) => permissoes.find((perm: any) => perm.id === id)) || [],
        };
        setPerfis((prev) => [...prev, newProfile]);
      }
    }

    setModalOpen(false);
    setFormData({});
    setEditingItem(null);
  };

  const handleDelete = async (type: 'user' | 'profile', id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este item?")) {
      await new Promise((r) => setTimeout(r, 200));
      if (type === "user") setUsuarios((prev) => prev.filter((u) => u.id !== id));
      else setPerfis((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <div className="usuarios-manager">
      <div className="header">
        <h1>👥 Gerenciamento de Usuários e Perfis</h1>
      </div>

      <div className="tabs">
        <button className={activeTab === "usuarios" ? "active" : ""} onClick={() => setActiveTab("usuarios")}>Usuários ({usuarios.length})</button>
        <button className={activeTab === "perfis" ? "active" : ""} onClick={() => setActiveTab("perfis")}>Perfis ({perfis.length})</button>
        <button className={activeTab === "permissoes" ? "active" : ""} onClick={() => setActiveTab("permissoes")}>Permissões ({permissoes.length})</button>
      </div>

      {activeTab === "usuarios" && (
        <div className="usuarios-tab">
          <div className="tab-header">
            <h2>Usuários</h2>
            <button className="btn-primary" onClick={handleCreateUser}>➕ Novo Usuário</button>
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
                {usuarios.map((user) => (
                  <tr key={user.id}>
                    <td>{user.nome}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      {user.perfis?.map((p: any) => (
                        <span key={p.id} className="badge">{p.nome}</span>
                      ))}
                    </td>
                    <td>
                      <span className={`status ${user.ativo ? "active" : "inactive"}`}>
                        {user.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>{user.ultimo_login ? new Date(user.ultimo_login).toLocaleString() : "Nunca"}</td>
                    <td>
                      <button className="btn-edit" onClick={() => handleEditUser(user)}>✏️</button>
                      <button className="btn-delete" onClick={() => handleDelete("user", user.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "perfis" && (
        <div className="perfis-tab">
          <div className="tab-header">
            <h2>Perfis</h2>
            <button className="btn-primary" onClick={handleCreateProfile}>➕ Novo Perfil</button>
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
                {perfis.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.descricao}</td>
                    <td>
                      {p.permissoes?.map((perm: any) => (
                        <span key={perm.id} className="badge">{perm.nome}</span>
                      ))}
                    </td>
                    <td>
                      <button className="btn-edit" onClick={() => handleEditProfile(p)}>✏️</button>
                      <button className="btn-delete" onClick={() => handleDelete("profile", p.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "permissoes" && (
        <div className="permissoes-tab">
          <div className="tab-header">
            <h2>Permissões</h2>
            <span className="permission-count">Total: {permissoes.length}</span>
          </div>

          <div className="permissions-grid">
            {permissoes.map((perm) => (
              <div key={perm.id} className="permission-module">
                <h3>{perm.nome}</h3>
                <div className="permission-list">
                  <div className="permission-item">
                    <span className="permission-name">{perm.descricao}</span>
                    <code className="permission-code">{perm.nome}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalType === 'user' ? 'Usuário' : 'Perfil'}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Inputs simples (exemplo) */}
              <div className="form-group">
                <label>Nome</label>
                <input value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <input value={formData.descricao || ''} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosManager;

