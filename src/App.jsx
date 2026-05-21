import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  MessageCircle,
  Phone,
  Scissors,
  Settings,
  Trash2,
  User,
  XCircle,
} from "lucide-react";

const WHATSAPP_NUMBER = "60133525894";

const defaultSlots = [
  { date: "2026-05-21", time: "8:00 PM", status: "available" },
  { date: "2026-05-21", time: "8:30 PM", status: "available" },
  { date: "2026-05-21", time: "9:00 PM", status: "available" },
];

const defaultInfo =
  "This booking system is only for UiTM Kuala Terengganu students. Choose an available slot, fill in your details, and come at your booked time.";

export default function App() {
  const [slots, setSlots] = useState([]);
  const [info, setInfo] = useState(defaultInfo);
  const [barberOpen, setBarberOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("Haircut");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notice, setNotice] = useState("");

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [searchBooking, setSearchBooking] = useState("");

  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const [generateDate, setGenerateDate] = useState("");
  const [startTime, setStartTime] = useState("20:00");
  const [endTime, setEndTime] = useState("22:30");
  const [interval, setInterval] = useState(30);

  useEffect(() => {
    const slotsQuery = query(collection(db, "slots"), orderBy("date"));

    const unsubscribe = onSnapshot(slotsQuery, async (snapshot) => {
      if (snapshot.empty) {
        for (const slot of defaultSlots) {
          await addDoc(collection(db, "slots"), {
            ...slot,
            createdAt: serverTimestamp(),
          });
        }

        setLoading(false);
        return;
      }

      const firebaseSlots = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data(),
        }))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        });

      setSlots(firebaseSlots);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const infoRef = doc(db, "settings", "mainInfo");

    const unsubscribe = onSnapshot(infoRef, async (snapshot) => {
      if (!snapshot.exists()) {
        await setDoc(infoRef, { text: defaultInfo });
        return;
      }

      setInfo(snapshot.data().text || defaultInfo);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
  const statusRef = doc(db, "settings", "barberStatus");

  const unsubscribe = onSnapshot(statusRef, async (snapshot) => {
    if (!snapshot.exists()) {
      await setDoc(statusRef, { open: true });
      return;
    }

    setBarberOpen(snapshot.data().open);
  });

  return () => unsubscribe();
}, []);

useEffect(() => {

  const unsubscribe =
    onAuthStateChanged(
      auth,
      (user) => {

        if(user){
          setFirebaseUser(user);
          setAdminLoggedIn(true);
        }

        else{
          setFirebaseUser(null);
          setAdminLoggedIn(false);
        }

      }
    );

  return () =>
    unsubscribe();

}, []);

  const price = service === "Haircut" ? 10 : 5;

  const availableCount = slots.filter(
    (slot) => slot.status === "available"
  ).length;

  const bookedCount = slots.filter(
    (slot) => slot.status === "booked"
  ).length;

  const groupedSlots = useMemo(() => {
    return slots.reduce((group, slot) => {
      group[slot.date] = group[slot.date] || [];
      group[slot.date].push(slot);
      return group;
    }, {});
  }, [slots]);
  const customerSlots = slots.filter(
  (slot) => !isPastSlot(slot)
);

const groupedCustomerSlots = customerSlots.reduce(
  (group, slot) => {
    group[slot.date] = group[slot.date] || [];
    group[slot.date].push(slot);
    return group;
  },
  {}
);
function getLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(
    now.getTime() - offset * 60000
  )
    .toISOString()
    .split("T")[0];
}
function isPastSlot(slot) {
  if (!slot.date || !slot.time) return false;

  const slotDateTime = new Date(`${slot.date} ${slot.time}`);
  const now = new Date();

  return slotDateTime < now;
}
const todayDate = getLocalDate();

const currentMonth =
  todayDate.slice(0, 7);

const realBookings =
  slots.filter(
    (slot) =>
      slot.status === "booked" &&
      slot.clientName &&
      slot.clientName !==
        "Blocked by admin"
  );

const todayAppointments =
  realBookings.filter(
    (slot) =>
      slot.date === todayDate
  );

const todayEarnings =
  todayAppointments.reduce(
    (total, slot) =>
      total +
      Number(slot.price || 0),
    0
  );

const monthEarnings =
  realBookings
    .filter((slot) =>
      slot.date?.startsWith(
        currentMonth
      )
    )
    .reduce(
      (total, slot) =>
        total +
        Number(
          slot.price || 0
        ),
      0
    );

const totalEarnings =
  realBookings.reduce(
    (total, slot) =>
      total +
      Number(slot.price || 0),
    0
  );
  const searchedBookings = realBookings.filter((slot) => {
  const search = searchBooking.toLowerCase();

  return (
    slot.clientName?.toLowerCase().includes(search) ||
    slot.clientPhone?.toLowerCase().includes(search) ||
    slot.service?.toLowerCase().includes(search) ||
    slot.date?.toLowerCase().includes(search) ||
    slot.time?.toLowerCase().includes(search)
  );
});
  async function handleBooking() {
    if (!name.trim() || !phone.trim() || !selectedSlot) {
      setNotice(
        "Please fill in your name, phone number, and choose an available slot."
      );
      return;
    }

    const targetSlot = slots.find((slot) => slot.id === selectedSlot);

    if (!targetSlot || targetSlot.status === "booked") {
      setNotice("Sorry, this slot is already booked. Please choose another slot.");
      return;
    }

    await updateDoc(doc(db, "slots", selectedSlot), {
      status: "booked",
      clientName: name,
      clientPhone: phone,
      service,
      price,
      bookedAt: serverTimestamp(),
    });

    setNotice(
      `Booking successful! ${service} on ${targetSlot.date}, ${targetSlot.time}. Total RM${price}.`
    );

    setName("");
    setPhone("");
    setSelectedSlot(null);
  }

  async function loginAdmin() {
  try {
    const result = await signInWithEmailAndPassword(
      auth,
      adminEmail,
      adminPassword
    );

    setFirebaseUser(result.user);
    setAdminLoggedIn(true);
    setNotice("Admin login successful.");
  } catch (error) {
    console.log(error.code);
    setNotice(error.code);
  }
}

  async function logoutAdmin() {

    await signOut(auth);

    setFirebaseUser(null);

    setAdminLoggedIn(false);

    setAdminOpen(false);

    setNotice(
      "Logged out."
    );
  }

  async function addSlot() {
    if (!newDate || !newTime.trim()) {
      setNotice("Please enter the date and time first.");
      return;
    }

    await addDoc(collection(db, "slots"), {
      date: newDate,
      time: newTime,
      status: "available",
      createdAt: serverTimestamp(),
    });

    setNewTime("");
    setNotice("New slot added successfully.");
  }

  async function generateSlots() {
    if (!generateDate || !startTime || !endTime) {
      setNotice("Please choose date, start time, and end time.");
      return;
    }

    const existingSlots = slots.filter((slot) => slot.date === generateDate);

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    let current = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if (current >= end) {
      setNotice("End time must be later than start time.");
      return;
    }

    let addedCount = 0;

    while (current <= end) {
      const hour24 = Math.floor(current / 60);
      const minute = current % 60;

      const period = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

      const formattedTime = `${hour12}:${minute
        .toString()
        .padStart(2, "0")} ${period}`;

      const duplicate = existingSlots.some(
        (slot) => slot.time === formattedTime
      );

      if (!duplicate) {
        await addDoc(collection(db, "slots"), {
          date: generateDate,
          time: formattedTime,
          status: "available",
          createdAt: serverTimestamp(),
        });

        addedCount++;
      }

      current += Number(interval);
    }

    setNotice(`${addedCount} slots generated successfully.`);
  }

  async function deleteSlot(id) {
    await deleteDoc(doc(db, "slots", id));
    setNotice("Slot deleted.");
  }

  async function cancelBooking(id) {
  await updateDoc(doc(db, "slots", id), {
    status: "available",
    clientName: "",
    clientPhone: "",
    service: "",
    price: 0,
    cancelledAt: serverTimestamp(),
  });

  setNotice(
    "Booking cancelled. Slot available again."
  );
}

  async function blockSlot(id) {
    await updateDoc(doc(db, "slots", id), {
      status: "booked",
      clientName: "Blocked by admin",
      clientPhone: "-",
      service: "Unavailable",
      price: 0,
    });

    setNotice("Slot blocked by admin.");
  }

  async function saveInfo() {
    await setDoc(doc(db, "settings", "mainInfo"), {
      text: info,
    });

    setNotice("Info section updated.");
  }

  async function toggleBarberStatus() {
  await setDoc(doc(db, "settings", "barberStatus"), {
    open: !barberOpen,
  });

  setNotice(
    !barberOpen
      ? "Barber is now open."
      : "Barber is now closed."
  );
}
  function openWhatsApp() {
    const text = encodeURIComponent("Hi, I need help with my haircut booking.");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between rounded-3xl border border-purple-500/20 bg-zinc-950 p-5 shadow-2xl shadow-purple-950/30">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-purple-300 md:tracking-[0.35em]">
              UiTM Kuala Terengganu
            </p>
            <h1 className="text-xl font-black md:text-3xl">
              Am Barber Booking
            </h1>
          </div>

          <button
            onClick={() => setAdminOpen(!adminOpen)}
            className="flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-700"
          >
            <Settings size={17} /> Admin
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-zinc-950 via-black to-purple-950/40 p-6 shadow-2xl shadow-purple-950/30 md:p-7">
            <p className="mb-4 inline-block rounded-full border border-purple-400/30 px-4 py-1 text-sm text-purple-200">
              Minimal booking system for students
            </p>

            <h2 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Book your haircut slot without waiting.
            </h2>

            <p className="mt-4 max-w-2xl text-zinc-300">
              Choose your service, check available slots, and confirm your booking instantly.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-purple-500/20 bg-black/50 p-5">
                <Scissors className="mb-3 text-purple-300" />
                <p className="text-sm text-zinc-400">Haircut</p>
                <p className="text-2xl font-bold">RM10</p>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-black/50 p-5">
                <Scissors className="mb-3 text-purple-300" />
                <p className="text-sm text-zinc-400">Hair Trim</p>
                <p className="text-2xl font-bold">RM5</p>
              </div>

              <button
                onClick={openWhatsApp}
                className="rounded-2xl border border-purple-500/20 bg-black/50 p-5 text-left hover:border-purple-300"
              >
                <MessageCircle className="mb-3 text-purple-300" />
                <p className="text-sm text-zinc-400">Need help?</p>
                <p className="text-lg font-bold">Contact WhatsApp</p>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-zinc-950 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Info className="text-purple-300" />
              <h3 className="text-xl font-bold">Info</h3>
            </div>

            <p className="leading-relaxed text-zinc-300">{info}</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-purple-500/10 p-4">
                <p className="text-sm text-zinc-400">Available</p>
                <p className="text-3xl font-black text-purple-200">
                  {availableCount}
                </p>
              </div>

              <div className="rounded-2xl bg-black p-4">
                <p className="text-sm text-zinc-400">Booked</p>
                <p className="text-3xl font-black">{bookedCount}</p>
              </div>
            </div>
          </div>
        </section>

        {adminOpen && (
          <section className="rounded-3xl border border-purple-500/20 bg-zinc-950 p-6">
            {!adminLoggedIn ? (
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold">
                    <Lock className="text-purple-300" /> Admin Login
                  </h3>
                  <p className="text-sm text-zinc-400">
                    admin only 
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(event)=>
                    setAdminEmail(
                    event.target.value
                    )}
                    placeholder="Admin email"
                    className="
                    rounded-xl
                    border
                    border-purple-500/30
                    bg-black
                    px-4
                    py-3
                    outline-none
                    "
                    />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                    placeholder="Enter password"
                    className="rounded-xl border border-purple-500/30 bg-black px-4 py-3 outline-none"
                  />

                  <button
                    onClick={loginAdmin}
                    className="rounded-xl bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-700"
                  >
                    Login
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black">Admin Panel</h3>

                  <button
                    onClick={logoutAdmin}
                    className="rounded-xl border border-purple-500/40 px-4 py-2 text-sm hover:bg-purple-950/40"
                  >
                    Logout
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
    <p className="text-sm text-zinc-400">Today Appointments</p>
    <p className="text-3xl font-black text-purple-200">
      {todayAppointments.length}
    </p>
  </div>

  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
    <p className="text-sm text-zinc-400">Today Earnings</p>
    <p className="text-3xl font-black text-purple-200">
      RM{todayEarnings}
    </p>
  </div>

  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
    <p className="text-sm text-zinc-400">This Month Earnings</p>
    <p className="text-3xl font-black text-purple-200">
      RM{monthEarnings}
    </p>
  </div>
</div>

<div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4">
  <div className="mb-3 flex items-center justify-between">
    <h4 className="text-lg font-bold">Today Appointments</h4>
    <p className="text-sm text-zinc-400">{todayDate}</p>
  </div>

  {todayAppointments.length === 0 ? (
    <p className="text-sm text-zinc-400">
      No appointments for today.
    </p>
  ) : (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {todayAppointments.map((slot) => (
        <div
          key={slot.id}
          className="rounded-xl border border-purple-500/20 bg-black p-4"
        >
          <p className="font-bold text-purple-200">{slot.time}</p>
          <p className="text-sm text-zinc-300">{slot.clientName}</p>
          <p className="text-sm text-zinc-400">
            {slot.service} · RM{slot.price}
          </p>
          <p className="text-sm text-zinc-500">{slot.clientPhone}</p>
        </div>
      ))}
    </div>
  )}
</div>

<div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4">
  <p className="mb-1 font-semibold">Total Earnings Record</p>
  <p className="text-sm text-zinc-400">All confirmed bookings</p>
  <p className="mt-2 text-3xl font-black text-purple-200">
    RM{totalEarnings}
  </p>
</div>
<div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4">
  <p className="mb-2 font-semibold">Barber Status</p>

  <p className="mb-3 text-sm text-zinc-400">
    Current status:
    <span className={barberOpen ? "text-green-400" : "text-red-400"}>
      {barberOpen ? " Open" : " Closed"}
    </span>
  </p>

  <button
    onClick={toggleBarberStatus}
    className={`rounded-xl px-4 py-3 font-semibold ${
      barberOpen
        ? "bg-red-600 hover:bg-red-700"
        : "bg-purple-600 hover:bg-purple-700"
    }`}
  >
    {barberOpen ? "Close Booking" : "Open Booking"}
  </button>
</div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4">
                    <p className="mb-2 font-semibold">Edit Info Section</p>

                    <textarea
                      value={info}
                      onChange={(event) => setInfo(event.target.value)}
                      className="h-32 w-full rounded-xl border border-purple-500/30 bg-black p-3 outline-none"
                    />

                    <button
                      onClick={saveInfo}
                      className="mt-3 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-700"
                    >
                      Save Info
                    </button>
                  </div>

                  <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4">
                    <p className="mb-2 font-semibold">Add New Slot</p>

                    <div className="grid gap-2">
                      <input
                        type="date"
                        value={newDate}
                        onChange={(event) => setNewDate(event.target.value)}
                        className="rounded-xl border border-purple-500/30 bg-black px-3 py-3 outline-none"
                      />

                      <input
                        value={newTime}
                        onChange={(event) => setNewTime(event.target.value)}
                        placeholder="Example: 8:00 PM"
                        className="rounded-xl border border-purple-500/30 bg-black px-3 py-3 outline-none"
                      />

                      <button
                        onClick={addSlot}
                        className="rounded-xl bg-purple-600 px-4 py-3 font-semibold hover:bg-purple-700"
                      >
                        Add Slot
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4">
                    <p className="mb-2 font-semibold">Auto Generate Slots</p>

                    <div className="grid gap-2">
                      <input
                        type="date"
                        value={generateDate}
                        onChange={(event) => setGenerateDate(event.target.value)}
                        className="rounded-xl border border-purple-500/30 bg-black px-3 py-3 outline-none"
                      />

                      <label className="text-sm text-zinc-400">Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        className="rounded-xl border border-purple-500/30 bg-black px-3 py-3 outline-none"
                      />

                      <label className="text-sm text-zinc-400">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        className="rounded-xl border border-purple-500/30 bg-black px-3 py-3 outline-none"
                      />

                      <label className="text-sm text-zinc-400">Interval</label>
                      <select
                        value={interval}
                        onChange={(event) => setInterval(event.target.value)}
                        className="rounded-xl border border-purple-500/30 bg-black px-3 py-3 outline-none"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>

                      <button
                        onClick={generateSlots}
                        className="rounded-xl bg-purple-600 px-4 py-3 font-semibold hover:bg-purple-700"
                      >
                        Generate Slots
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4">
  <p className="mb-2 font-semibold">Search Booking</p>

  <input
    value={searchBooking}
    onChange={(event) => setSearchBooking(event.target.value)}
    placeholder="Search by name, phone, service, date, or time"
    className="w-full rounded-xl border border-purple-500/30 bg-black px-3 py-3 outline-none"
  />

  {searchBooking && (
    <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {searchedBookings.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No booking found.
        </p>
      ) : (
        searchedBookings.map((slot) => (
          <div
            key={slot.id}
            className="rounded-xl border border-purple-500/20 bg-black p-4"
          >
            <p className="font-bold text-purple-200">
              {slot.date} · {slot.time}
            </p>

            <p className="text-sm text-zinc-300">
              {slot.clientName}
            </p>

            <p className="text-sm text-zinc-400">
              {slot.service} · RM{slot.price}
            </p>

            <p className="text-sm text-zinc-500">
              {slot.clientPhone}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {slot.status === "booked" && (
                <>
                  <button
                    onClick={() => cancelBooking(slot.id)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-700"
                  >
                    Cancel Booking
                  </button>

                  <button
                    onClick={() => markDone(slot.id)}
                    className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold hover:bg-purple-700"
                  >
                    Mark Done
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )}
</div>
                <div>
                  <h4 className="mb-3 text-lg font-bold">Manage Slots</h4>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="rounded-2xl border border-purple-500/20 bg-black/40 p-4"
                      >
                        <p className="font-bold">{slot.date}</p>
                        <p className="text-zinc-300">{slot.time}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          Status:
                          {
                          slot.status ===
                          "booked"

                          ? "Booked"

                          : slot.status ===
                          "completed"

                          ? "Completed"

                          : "Available"
                          }
                        </p>

                        {slot.clientName && (
                          <p className="text-sm text-zinc-500">
                            Client: {slot.clientName}
                          </p>
                        )}

                        {slot.clientPhone && (
                          <p className="text-sm text-zinc-500">
                            Phone: {slot.clientPhone}
                          </p>
                        )}

                        {slot.service && (
                          <p className="text-sm text-zinc-500">
                            Service: {slot.service}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {slot.status === "booked" ? (
                            <>
                            <button
                            onClick={() =>
                            cancelBooking(
                            slot.id
                            )
                            }
                            className="
                            rounded-lg
                            bg-red-600
                            px-3
                            py-2
                            text-sm
                            font-semibold
                            hover:bg-red-700
                            "
                            >

                            Cancel Booking

                            </button>

                            <button
                            onClick={() =>
                            markDone(
                            slot.id
                            )
                            }
                            className="
                            rounded-lg
                            bg-purple-600
                            px-3
                            py-2
                            text-sm
                            font-semibold
                            hover:bg-purple-700
                            "
                            >

                            Mark Done

                            </button>
                            </>
                          ) : (
                            <button
                              onClick={() => blockSlot(slot.id)}
                              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold hover:bg-zinc-700"
                            >
                              Block Slot
                            </button>
                          )}

                          <button
                            onClick={() => deleteSlot(slot.id)}
                            className="flex items-center gap-1 rounded-lg border border-red-400/30 px-3 py-2 text-sm text-red-200 hover:bg-red-950/30"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-purple-500/20 bg-zinc-950 p-6">
            <h3 className="mb-5 text-2xl font-black">Booking Form</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Name
                </label>

                <div className="flex items-center rounded-xl border border-purple-500/30 bg-black px-3">
                  <User className="mr-2 h-4 w-4 text-purple-300" />

                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    className="w-full bg-transparent py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Phone Number
                </label>

                <div className="flex items-center rounded-xl border border-purple-500/30 bg-black px-3">
                  <Phone className="mr-2 h-4 w-4 text-purple-300" />

                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="01X-XXXXXXX"
                    className="w-full bg-transparent py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Service Option
                </label>

                <select
                  value={service}
                  onChange={(event) => setService(event.target.value)}
                  className="w-full rounded-xl border border-purple-500/30 bg-black px-3 py-3 outline-none"
                >
                  <option>Haircut</option>
                  <option>Hair Trim</option>
                </select>

                <p className="mt-2 text-purple-200">Total: RM{price}</p>
              </div>
              {!barberOpen && (
  <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
    Barber is currently closed. Please contact through WhatsApp for urgent questions.
  </p>
)}
              <button
                onClick={handleBooking}
                disabled={!barberOpen}
                className={`w-full rounded-xl py-4 font-bold ${
                  barberOpen
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "cursor-not-allowed bg-zinc-700 text-zinc-400"
                }`}
              >
                {barberOpen ? "Confirm Booking" : "Booking Closed"}
              </button>

              <button
                onClick={openWhatsApp}
                className="w-full rounded-xl border border-purple-500/40 py-4 font-bold text-purple-100 hover:bg-purple-950/40"
              >
                Contact WhatsApp
              </button>

              {notice && (
                <p className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-sm text-purple-100">
                  {notice}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-zinc-950 p-6">
            <h3 className="mb-5 flex items-center gap-2 text-2xl font-black">
              <CalendarDays className="text-purple-300" /> Slot Availability
            </h3>

            {loading && <p className="text-zinc-400">Loading slots...</p>}
            {!loading && Object.keys(groupedCustomerSlots).length === 0 && (
  <p className="text-zinc-400">
    No available upcoming slots at the moment.
  </p>
)}

            <div className="space-y-6">
              {Object.entries(groupedCustomerSlots).map(([date, daySlots]) => (
                <div key={date}>
                  <p className="mb-3 font-bold text-purple-200">{date}</p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.id}
                        disabled={slot.status === "booked"}
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selectedSlot === slot.id
                            ? "border-purple-300 bg-purple-600/30"
                            : "border-purple-500/20 bg-black/40"
                        } ${
                          slot.status === "booked"
                            ? "cursor-not-allowed opacity-60"
                            : "hover:border-purple-300 hover:bg-purple-950/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 font-semibold">
                            <Clock size={16} className="text-purple-300" />
                            {slot.time}
                          </span>

                          {slot.status === "available" ? (
                            <CheckCircle2 className="text-purple-300" />
                          ) : (
                            <XCircle className="text-zinc-300" />
                          )}
                        </div>

                        <p className="mt-2 text-sm text-zinc-400">
                          {slot.status === "available"
                            ? "Available"
                            : "Already booked"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}