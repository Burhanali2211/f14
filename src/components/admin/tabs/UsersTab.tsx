import { Plus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import type { UsersTabProps } from '../types';

export const UsersTab = ({ userProfiles, currentUserId, onOpenDialog }: UsersTabProps) => {
  return (
    <TabsContent value="users" className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button onClick={() => onOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>
      <div className="grid gap-3">
        {userProfiles.map((userProfile) => {
          const isCurrentUser = currentUserId && userProfile.id === currentUserId;
          return (
            <div
              key={userProfile.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft ${
                isCurrentUser ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{userProfile.email}</h3>
                    {isCurrentUser && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        You
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 w-fit ${
                    userProfile.role === 'admin' 
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                      : userProfile.role === 'uploader'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}>
                    {userProfile.role}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">
                  {userProfile.full_name || 'No name provided'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenDialog(userProfile)}
                  title="Edit role"
                  className="h-9 w-9 sm:h-10 sm:w-10"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </TabsContent>
  );
};

