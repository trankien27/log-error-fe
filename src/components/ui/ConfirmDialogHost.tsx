import { useSyncExternalStore } from 'react';
import { finishConfirm, getConfirmRequest, subscribeConfirm } from './confirm';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './shadcn/alert-dialog';
import { Button } from './shadcn/button';

export default function ConfirmDialogHost() {
  const request = useSyncExternalStore(subscribeConfirm, getConfirmRequest);
  if (!request) return null;

  const { title, content, okText, cancelText = 'Hủy', danger = true } = request;
  const description = content == null ? { 'aria-describedby': undefined } : {};

  return (
    <AlertDialog open onOpenChange={open => { if (!open) finishConfirm(request, false); }}>
      <AlertDialogContent {...description} className="z-[121]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {content != null && <AlertDialogDescription asChild><div>{content}</div></AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">{cancelText}</AlertDialogCancel>
          <Button type="button" variant={danger ? 'destructive' : 'default'} onClick={() => finishConfirm(request, true)}>
            {okText ?? (danger ? 'Xóa' : 'Đồng ý')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
