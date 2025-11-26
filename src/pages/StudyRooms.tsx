import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, ExternalLink } from 'lucide-react';

export default function StudyRooms() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          Study Rooms
        </h1>
        <p className="text-muted-foreground">Connect with others in collaborative study sessions</p>
      </div>

      <Card>
        <CardContent className="pt-6 text-center">
          <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Video Conferencing</h3>
          <p className="text-muted-foreground mb-6">Join video calls with MeshMeet - our integrated video conferencing solution</p>
          <Button
            onClick={() => window.open('https://meetmesh-delta.vercel.app/', '_blank')}
            className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-6 px-8 text-lg"
          >
            <Video className="h-5 w-5" />
            Open MeshMeet
            <ExternalLink className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
