import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { CalendarPage } from "@/pages/calendar-page";
import { MessageListPage } from "@/pages/message-list-page";
import { MessageEditorPage } from "@/pages/message-editor-page";
import { GroupListPage } from "@/pages/group-list-page";
import { GroupEditorPage } from "@/pages/group-editor-page";
import { TemplateListPage } from "@/pages/template-list-page";
import { TemplateEditorPage } from "@/pages/template-editor-page";
import { SettingsPage } from "@/pages/settings-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/calendar" replace /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "messages", element: <MessageListPage /> },
      { path: "messages/new", element: <MessageEditorPage /> },
      { path: "messages/:id", element: <MessageEditorPage /> },
      { path: "groups", element: <GroupListPage /> },
      { path: "groups/new", element: <GroupEditorPage /> },
      { path: "groups/:id", element: <GroupEditorPage /> },
      { path: "templates", element: <TemplateListPage /> },
      { path: "templates/new", element: <TemplateEditorPage /> },
      { path: "templates/:id", element: <TemplateEditorPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
