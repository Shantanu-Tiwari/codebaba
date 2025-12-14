"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getUserProfile, updateUserProfile, getConnectedRepositories, disconnectAllRepositories, disconnectRepository } from "@/module/settings/actions"
import { toast } from "sonner"

const SettingsPage = () => {
    const [profile, setProfile] = useState<any>(null)
    const [repositories, setRepositories] = useState<any[]>([])
    const [profileLoading, setProfileLoading] = useState(false)
    const [disconnectingAll, setDisconnectingAll] = useState(false)
    const [disconnectingRepo, setDisconnectingRepo] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: "", email: "" })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const [userProfile, repos] = await Promise.all([
            getUserProfile(),
            getConnectedRepositories()
        ])
        setProfile(userProfile)
        setRepositories(repos)
        if (userProfile) {
            setFormData({ name: userProfile.name || "", email: userProfile.email || "" })
        }
    }

    const handleUpdateProfile = async () => {
        setProfileLoading(true)
        const result = await updateUserProfile(formData)
        if (result.success) {
            toast.success("Profile updated successfully")
            setProfile(result.user)
        } else {
            toast.error("Failed to update profile")
        }
        setProfileLoading(false)
    }

    const handleDisconnectAll = async () => {
        setDisconnectingAll(true)
        const result = await disconnectAllRepositories()
        if (result.success) {
            toast.success("All repositories disconnected")
            setRepositories([])
        } else {
            toast.error("Failed to disconnect repositories")
        }
        setDisconnectingAll(false)
    }

    const handleDisconnectRepo = async (repoId: string) => {
        setDisconnectingRepo(repoId)
        try {
            await disconnectRepository(repoId)
            toast.success("Repository disconnected")
            setRepositories(repos => repos.filter(r => r.id !== repoId))
        } catch (error) {
            toast.error("Failed to disconnect repository")
        }
        setDisconnectingRepo(null)
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account settings and preferences</p>
            </div>

            <div className="grid gap-6">
                {/* Profile Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Update your profile information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input 
                                    id="name" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Your name" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    placeholder="your@email.com" 
                                />
                            </div>
                        </div>
                        <Button onClick={handleUpdateProfile} disabled={profileLoading}>
                            {profileLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardContent>
                </Card>

                {/* GitHub Integration */}
                <Card>
                    <CardHeader>
                        <CardTitle>GitHub Integration</CardTitle>
                        <CardDescription>Manage your GitHub connection</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Connected Repositories</p>
                                    <p className="text-sm text-muted-foreground">{repositories.length} repositories connected</p>
                                </div>
                                <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={handleDisconnectAll}
                                    disabled={disconnectingAll || repositories.length === 0}
                                >
                                    {disconnectingAll ? "Disconnecting..." : "Disconnect All"}
                                </Button>
                            </div>
                            {repositories.length > 0 && (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {repositories.map(repo => (
                                        <div key={repo.id} className="flex items-center justify-between p-2 border rounded">
                                            <div>
                                                <p className="text-sm font-medium">{repo.fullName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Connected {new Date(repo.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleDisconnectRepo(repo.id)}
                                                disabled={disconnectingRepo === repo.id}
                                            >
                                                {disconnectingRepo === repo.id ? "Disconnecting..." : "Disconnect"}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>Configure your notification preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Email Notifications</p>
                                <p className="text-sm text-muted-foreground">Receive email updates for reviews</p>
                            </div>
                            <Button variant="outline" size="sm">Enable</Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">PR Review Alerts</p>
                                <p className="text-sm text-muted-foreground">Get notified when reviews are complete</p>
                            </div>
                            <Button variant="outline" size="sm">Enable</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>Irreversible actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive">Delete Account</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default SettingsPage