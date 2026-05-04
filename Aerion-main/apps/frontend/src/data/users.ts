export type DemoUser = {
  id: string
  name: string
  profile: string
  email: string
  role: string
}

export const demoUsers: DemoUser[] = [
  {
    id: "1",
    name: "Raman Kumar",
    profile: "/profile.jpg",
    email: "raman.work@gmail.com",
    role: "Primary trader"
  },

  {
    id: "2",
    name: "Joe GoldBerg",
    profile: "/Joe.jpeg",
    email: "joe@gmail.com",
    role: "Market observer"
  },

  {
    id: "3",
    name: "Berlin",
    profile: "/Berlin.jpeg",
    email: "berlin@gmail.com",
    role: "Portfolio manager"
  }
]

export const demoUsersById = demoUsers.reduce<
  Record<string, DemoUser>
>((users, currentUser) => {

  users[currentUser.id] = currentUser
  return users

}, {})

export function getDemoUser(id: string) {
  return demoUsersById[id] ?? demoUsers[0]
}
