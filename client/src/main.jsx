import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Camera, LogOut, MessageCircle, Send, UserCheck, UserPlus, UserRound, Users } from "lucide-react";
import { apiRequest } from "./api.js";
import "./styles.css";

function Avatar({ user, size = "md" }) {
  const initials = (user?.fullName || user?.username || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return user?.avatarUrl ? (
    <img className={`avatar ${size}`} src={user.avatarUrl} alt={user.fullName || "Profile"} />
  ) : (
    <div className={`avatar ${size}`}>{initials}</div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    loginId: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const path = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister
        ? {
            fullName: form.fullName,
            username: form.username,
            password: form.password,
            confirmPassword: form.confirmPassword
          }
        : {
            loginId: form.loginId,
            password: form.password
          };

      const data = await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(body)
      });

      localStorage.setItem("token", data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-mark">
          <MessageCircle size={28} />
        </div>
        <h1>QUICK SMS</h1>
        <p className="muted">Register karo, profile banao, follow back ke baad message karo.</p>

        <div className="segmented">
          <button className={isRegister ? "active" : ""} onClick={() => setMode("register")} type="button">
            Register
          </button>
          <button className={!isRegister ? "active" : ""} onClick={() => setMode("login")} type="button">
            Login
          </button>
        </div>

        <form onSubmit={submit}>
          {isRegister ? (
            <>
              <label>
                Full name
                <input name="fullName" value={form.fullName} onChange={updateField} placeholder="Aman Sharma" />
              </label>
              <label>
                Username
                <input name="username" value={form.username} onChange={updateField} placeholder="aman" />
              </label>
            </>
          ) : (
            <label>
              Username or userId
              <input name="loginId" value={form.loginId} onChange={updateField} placeholder="aman or aman_x7m2q" />
            </label>
          )}

          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={updateField} placeholder="******" />
          </label>

          {isRegister && (
            <label>
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={updateField}
                placeholder="******"
              />
            </label>
          )}

          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={loading} type="submit">
            {loading ? "Please wait..." : isRegister ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Profile({ user, onUpdate }) {
  const [fullName, setFullName] = useState(user.fullName);
  const [userId, setUserId] = useState(user.userId);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user.fullName);
    setUserId(user.userId);
    setAvatarUrl(user.avatarUrl || "");
  }, [user]);

  function pickPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file");
      return;
    }

    if (file.size > 700 * 1024) {
      setMessage("Photo size 700KB se kam rakho");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result);
    reader.readAsDataURL(file);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      const data = await apiRequest("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ fullName, userId, avatarUrl })
      });
      onUpdate(data.user);
      setMessage("Profile updated");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-panel">
      <div className="section-title">
        <UserRound size={18} />
        <h2>Profile</h2>
      </div>
      <form onSubmit={saveProfile} className="compact-form">
        <div className="photo-editor">
          <Avatar user={{ ...user, avatarUrl, fullName }} size="lg" />
          <label className="photo-button">
            <Camera size={16} />
            <span>Photo</span>
            <input type="file" accept="image/*" onChange={pickPhoto} />
          </label>
        </div>
        <label>
          Full name
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </label>
        <label>
          User ID
          <input value={userId} onChange={(event) => setUserId(event.target.value)} />
        </label>
        <label>
          Photo URL
          <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Upload or paste image URL" />
        </label>
        <p className="mini">Username: @{user.username}</p>
        {message && <p className={message.includes("updated") ? "success" : "error"}>{message}</p>}
        <button className="primary small" disabled={saving} type="submit">
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </section>
  );
}

function People({ onContactsChanged }) {
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadPeople() {
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/users/people");
      setPeople(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPeople();
  }, []);

  const visiblePeople = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return people;

    return people.filter((person) =>
      [person.fullName, person.username, person.userId].some((value) => value.toLowerCase().includes(cleanQuery))
    );
  }, [people, query]);

  async function toggleFollow(person) {
    setError("");

    try {
      const method = person.isFollowing ? "DELETE" : "POST";
      const data = await apiRequest(`/users/${person._id}/follow`, { method });
      if (data.user) {
        setPeople((current) => current.map((item) => (item._id === person._id ? data.user : item)));
      }
      onContactsChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="people-panel">
      <div className="panel-header">
        <div className="section-title compact-title">
          <Users size={18} />
          <h2>People</h2>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" />
      </div>
      {error && <p className="error panel-message">{error}</p>}
      {loading ? <p className="empty panel-message">Loading people...</p> : null}
      <div className="people-grid">
        {visiblePeople.map((person) => (
          <article key={person._id} className="person-card">
            <Avatar user={person} size="lg" />
            <div className="person-info">
              <h3>{person.fullName}</h3>
              <p>@{person.username}</p>
              <small>{person.userId}</small>
            </div>
            <div className="follow-state">
              {person.isMutual ? "Message unlocked" : person.followsMe ? "Follows you" : person.isFollowing ? "Requested" : "Not following"}
            </div>
            <button className={person.isFollowing ? "ghost-action" : "primary small"} onClick={() => toggleFollow(person)} type="button">
              {person.isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
              <span>{person.isFollowing ? "Following" : person.followsMe ? "Follow back" : "Follow"}</span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Messenger({ user, refreshKey }) {
  const [contacts, setContacts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const selectedName = useMemo(() => selectedUser?.fullName || "Select a contact", [selectedUser]);

  async function loadContacts() {
    setError("");

    try {
      const data = await apiRequest("/users/contacts");
      setContacts(data.users);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadContacts();
  }, [refreshKey]);

  async function openChat(contact) {
    setSelectedUser(contact);
    setError("");

    try {
      const data = await apiRequest(`/messages/${contact._id}`);
      setMessages(data.messages);
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (!selectedUser || !text.trim()) {
      return;
    }

    try {
      const data = await apiRequest(`/messages/${selectedUser._id}`, {
        method: "POST",
        body: JSON.stringify({ text })
      });
      setMessages((current) => [...current, data.message]);
      setText("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="messenger">
      <aside className="contacts">
        <div className="section-title compact-title">
          <MessageCircle size={18} />
          <h2>Messages</h2>
        </div>
        <p className="mini">Yahan wahi users aayenge jinke saath follow back complete hai.</p>
        {error && <p className="error">{error}</p>}
        <div className="contact-list">
          {contacts.map((contact) => (
            <button key={contact._id} onClick={() => openChat(contact)} className="contact" type="button">
              <Avatar user={contact} size="sm" />
              <span>{contact.fullName}</span>
              <small>@{contact.username} - {contact.userId}</small>
            </button>
          ))}
          {!contacts.length && <p className="empty">Abhi koi mutual follow contact nahi hai.</p>}
        </div>
      </aside>

      <div className="chat">
        <header>
          <div className="chat-user">
            {selectedUser && <Avatar user={selectedUser} size="sm" />}
            <div>
              <h2>{selectedName}</h2>
              {selectedUser && <p>{selectedUser.userId}</p>}
            </div>
          </div>
        </header>
        <div className="messages">
          {selectedUser ? (
            messages.map((message) => (
              <div key={message._id} className={message.sender === user.id ? "bubble mine" : "bubble"}>
                {message.text}
              </div>
            ))
          ) : (
            <p className="empty">People section me follow back complete hone ke baad chat select karo.</p>
          )}
        </div>
        <form className="composer" onSubmit={sendMessage}>
          <input
            disabled={!selectedUser}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type message"
          />
          <button aria-label="Send" disabled={!selectedUser} type="submit">
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactsRefresh, setContactsRefresh] = useState(0);
  const [activePage, setActivePage] = useState("messages");

  useEffect(() => {
    async function loadMe() {
      if (!localStorage.getItem("token")) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/auth/me");
        setUser(data.user);
      } catch {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    }

    loadMe();
  }, []);

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  if (loading) {
    return <main className="loading">Loading...</main>;
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-user">
          <Avatar user={user} size="sm" />
          <div>
            <h1>QUICK SMS</h1>
            <p>{user.fullName} - {user.userId}</p>
          </div>
        </div>

        <nav className="app-nav" aria-label="Main navigation">
          <button className={activePage === "messages" ? "nav-button active" : "nav-button"} onClick={() => setActivePage("messages")} type="button">
            <MessageCircle size={18} />
            <span>Messages</span>
          </button>
          <button className={activePage === "people" ? "nav-button active" : "nav-button"} onClick={() => setActivePage("people")} type="button">
            <Users size={18} />
            <span>People</span>
          </button>
          <button className={activePage === "profile" ? "nav-button active" : "nav-button"} onClick={() => setActivePage("profile")} type="button">
            <UserRound size={18} />
            <span>Profile</span>
          </button>
        </nav>

        <button className="icon-button" onClick={logout} aria-label="Logout" type="button">
          <LogOut size={20} />
        </button>
      </header>

      <section className="page-shell">
        {activePage === "messages" && <Messenger user={user} refreshKey={contactsRefresh} />}
        {activePage === "people" && <People onContactsChanged={() => setContactsRefresh((value) => value + 1)} />}
        {activePage === "profile" && <Profile user={user} onUpdate={setUser} />}
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);


