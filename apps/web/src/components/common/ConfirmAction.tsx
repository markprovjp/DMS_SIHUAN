import React from "react";
import { Popconfirm, Button } from "antd";

interface ConfirmActionProps {
  title: string;
  description?: string;
  onConfirm: () => void;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
  children: React.ReactElement;
}

/** Popconfirm với label tiếng Việt mặc định — thay thế window.confirm. */
export default function ConfirmAction({
  title,
  description,
  onConfirm,
  okText = "Xác nhận",
  cancelText = "Hủy",
  danger,
  children,
}: ConfirmActionProps) {
  return (
    <Popconfirm
      title={title}
      description={description}
      onConfirm={onConfirm}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={danger ? { danger: true } : undefined}
    >
      {children}
    </Popconfirm>
  );
}

// Re-export Button để dùng inline: <ConfirmAction.Trigger danger>Xóa</ConfirmAction.Trigger>
ConfirmAction.Trigger = Button;
