import { useNavigate } from "react-router-dom";
import { Send, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuickCreatePanel() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">快速创建</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4">
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => navigate("/messages/new?mode=instant")}
        >
          <Send className="mr-2 h-4 w-4" /> 立即发送消息
        </Button>
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => navigate("/messages/new")}
        >
          <Clock className="mr-2 h-4 w-4" /> 创建定时消息
        </Button>
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => navigate("/templates")}
        >
          <FileText className="mr-2 h-4 w-4" /> 从模板创建
        </Button>
      </CardContent>
    </Card>
  );
}
